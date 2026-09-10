import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";
import { getFreshConnectorToken } from "@/lib/connectors";
import { getUserInstallation, mintInstallationToken } from "@/lib/githubApp";
import { validateBuildFiles } from "@/lib/buildFileLimits";

const GITHUB_API = "https://api.github.com";

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

// Pushes the Build page's whole virtual file set to GitHub as ONE atomic
// commit via the Git Data API (blob -> tree -> commit -> ref), rather
// than sequential Contents-API PUTs per file -- a mid-way failure with
// the Contents API would leave a half-written repo; this can't.
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await hasBuildAccess(user.id))) {
    return NextResponse.json({ error: "The Build page requires a Growth or Enterprise plan." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const files = body?.files as Record<string, string> | undefined;
  const repoName = body?.repoName as string | undefined;
  const isPrivate = body?.private !== false;
  const commitMessage = (body?.commitMessage as string | undefined) || "Update from ChatGiZa Build";
  if (!files || Object.keys(files).length === 0 || !repoName) {
    return NextResponse.json({ error: "files and repoName are required" }, { status: 400 });
  }
  const sizeError = validateBuildFiles(files);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 400 });
  }

  // The GitHub App installation (see githubApp.ts), if the user has one,
  // is preferred for everything below -- it's the reliable, no-repeat-
  // popup connection. The classic OAuth token is kept around purely as
  // the fallback for the one thing a GitHub App genuinely cannot do:
  // create a brand-new repo under a PERSONAL account (GitHub only
  // allows app-token repo creation for organizations, regardless of the
  // app's own permissions -- a platform limitation, not a ChatGiZa one).
  const [installation, classicToken] = await Promise.all([
    getUserInstallation(user.id),
    getFreshConnectorToken(user.id, "github"),
  ]);
  const installationToken = installation ? await mintInstallationToken(installation.installationId) : null;
  const primaryToken = installationToken ?? classicToken?.accessToken ?? null;
  if (!primaryToken) {
    return NextResponse.json({ error: "Connect GitHub first." }, { status: 400 });
  }

  try {
    let owner: string;
    if (installation) {
      owner = installation.accountLogin;
    } else {
      const meRes = await gh(primaryToken, "/user");
      if (!meRes.ok) {
        return NextResponse.json({ error: "GitHub rejected the stored connection. Please reconnect GitHub." }, { status: 400 });
      }
      const me = await meRes.json();
      owner = me.login as string;
    }

    // Create the repo if it doesn't exist yet; treat "already exists" as
    // success rather than an error.
    const repoRes = await gh(primaryToken, `/repos/${owner}/${repoName}`);
    if (repoRes.status === 404) {
      const canCreateWithInstallationToken = installation?.accountType === "Organization";
      if (canCreateWithInstallationToken) {
        const createRes = await gh(primaryToken, `/orgs/${owner}/repos`, {
          method: "POST",
          body: JSON.stringify({ name: repoName, private: isPrivate, auto_init: false }),
        });
        if (!createRes.ok) {
          const errBody = await createRes.text();
          console.error("GitHub org repo creation failed:", createRes.status, errBody);
          return NextResponse.json({ error: "Could not create the GitHub repository." }, { status: 502 });
        }
      } else if (classicToken) {
        // Personal account (or no App installation at all): only the
        // classic OAuth token's /user/repos can create it.
        const createRes = await gh(classicToken.accessToken, "/user/repos", {
          method: "POST",
          body: JSON.stringify({ name: repoName, private: isPrivate, auto_init: false }),
        });
        if (!createRes.ok) {
          const errBody = await createRes.text();
          console.error("GitHub repo creation failed:", createRes.status, errBody);
          return NextResponse.json({ error: "Could not create the GitHub repository." }, { status: 502 });
        }
      } else {
        return NextResponse.json(
          {
            error:
              "This GitHub account is personal, and ChatGiZa's GitHub App can't create new repos there (only push to existing ones) -- create the repo on GitHub yourself first, or also connect GitHub the classic way for repo creation.",
          },
          { status: 400 }
        );
      }
    } else if (!repoRes.ok) {
      return NextResponse.json({ error: "Could not reach that GitHub repository." }, { status: 502 });
    }

    // Everything from here on operates on a repo that's confirmed to
    // exist -- back to the one primary token (installation-preferred).
    const accessToken = primaryToken;

    // Look up the current default-branch ref, if one exists (brand new
    // repos have zero commits and no ref yet).
    const branch = "main";
    let parentCommitSha: string | null = null;
    let baseTreeSha: string | undefined;
    const refRes = await gh(accessToken, `/repos/${owner}/${repoName}/git/ref/heads/${branch}`);
    if (refRes.ok) {
      const refData = await refRes.json();
      parentCommitSha = refData.object.sha as string;
      const commitRes = await gh(accessToken, `/repos/${owner}/${repoName}/git/commits/${parentCommitSha}`);
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree.sha as string;
      }
    }

    // Everything AFTER the repo's very first commit lands on a dedicated
    // review branch + pull request instead of straight onto main, so the
    // real human who owns this GitHub repo gets a chance to see and
    // approve AI-made changes before they reach the branch their own CI/
    // deploys actually watch -- the same protection a PR gives a human
    // engineer, applied to ChatGiZa's own end users, not to how ChatGiZa
    // itself is developed. The very first commit (parentCommitSha still
    // null, i.e. a brand-new/empty repo) still goes straight onto main --
    // there is nothing yet to diff against, and this is the same "create
    // the repo" moment that was always instant.
    const REVIEW_BRANCH = "chatgiza-updates";
    let targetBranch = branch;
    // Whether targetBranch already has a ref to PATCH, vs needing to be
    // created fresh with a POST -- independent of parentCommitSha, which
    // (for a brand-new review branch) is set to main's tip as the base to
    // branch off of, not proof the review branch itself already exists.
    let targetBranchExists = parentCommitSha !== null;
    const usePullRequest = parentCommitSha !== null;
    if (usePullRequest) {
      targetBranch = REVIEW_BRANCH;
      const reviewRefRes = await gh(accessToken, `/repos/${owner}/${repoName}/git/ref/heads/${REVIEW_BRANCH}`);
      targetBranchExists = reviewRefRes.ok;
      if (reviewRefRes.ok) {
        // The review branch already has commits ChatGiZa made since the
        // user last merged its PR -- build on top of those, not back on
        // main's tip, so this sync doesn't discard them.
        const reviewRefData = await reviewRefRes.json();
        parentCommitSha = reviewRefData.object.sha as string;
        const reviewCommitRes = await gh(accessToken, `/repos/${owner}/${repoName}/git/commits/${parentCommitSha}`);
        if (reviewCommitRes.ok) {
          baseTreeSha = (await reviewCommitRes.json()).tree.sha as string;
        }
      }
      // If reviewRefRes 404s, the review branch doesn't exist yet --
      // parentCommitSha/baseTreeSha stay pointed at main's tip from
      // above, and the ref-creation step below branches off from there.
    }

    // Create a blob per file, then one tree, one commit, one ref update --
    // this is the atomic part: nothing is visible on the branch until the
    // final ref update succeeds.
    const blobEntries = await Promise.all(
      Object.entries(files).map(async ([path, content]) => {
        const blobRes = await gh(accessToken, `/repos/${owner}/${repoName}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content, encoding: "utf-8" }),
        });
        if (!blobRes.ok) throw new Error(`Failed to create blob for ${path}`);
        const blob = await blobRes.json();
        return { path, mode: "100644" as const, type: "blob" as const, sha: blob.sha as string };
      })
    );

    const treeRes = await gh(accessToken, `/repos/${owner}/${repoName}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ tree: blobEntries, ...(baseTreeSha ? { base_tree: baseTreeSha } : {}) }),
    });
    if (!treeRes.ok) {
      console.error("GitHub tree creation failed:", await treeRes.text());
      return NextResponse.json({ error: "Could not build the commit tree." }, { status: 502 });
    }
    const tree = await treeRes.json();

    const commitRes = await gh(accessToken, `/repos/${owner}/${repoName}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: commitMessage,
        tree: tree.sha,
        parents: parentCommitSha ? [parentCommitSha] : [],
      }),
    });
    if (!commitRes.ok) {
      console.error("GitHub commit creation failed:", await commitRes.text());
      return NextResponse.json({ error: "Could not create the commit." }, { status: 502 });
    }
    const commit = await commitRes.json();

    const updateRefRes = targetBranchExists
      ? await gh(accessToken, `/repos/${owner}/${repoName}/git/refs/heads/${targetBranch}`, {
          method: "PATCH",
          body: JSON.stringify({ sha: commit.sha, force: false }),
        })
      : await gh(accessToken, `/repos/${owner}/${repoName}/git/refs`, {
          method: "POST",
          body: JSON.stringify({ ref: `refs/heads/${targetBranch}`, sha: commit.sha }),
        });
    if (!updateRefRes.ok) {
      console.error("GitHub ref update failed:", await updateRefRes.text());
      return NextResponse.json({ error: "Could not update the branch." }, { status: 502 });
    }

    // Make sure a PR from the review branch into main is open once it has
    // commits on it -- created once, then just accumulates new commits
    // (and diff) on every later sync until the user reviews and merges
    // it, rather than opening a new PR per sync.
    let prUrl: string | null = null;
    if (usePullRequest) {
      const existingPrRes = await gh(
        accessToken,
        `/repos/${owner}/${repoName}/pulls?head=${owner}:${REVIEW_BRANCH}&base=${branch}&state=open`
      );
      const existingPrs = existingPrRes.ok ? await existingPrRes.json() : [];
      if (Array.isArray(existingPrs) && existingPrs.length > 0) {
        prUrl = existingPrs[0].html_url as string;
      } else {
        const createPrRes = await gh(accessToken, `/repos/${owner}/${repoName}/pulls`, {
          method: "POST",
          body: JSON.stringify({
            title: "ChatGiZa: latest changes",
            head: REVIEW_BRANCH,
            base: branch,
            body:
              "Changes made by ChatGiZa's Build agent, waiting for review. New updates from ChatGiZa will keep " +
              "landing on this same branch/PR until it's merged -- merge it whenever you're ready to bring them " +
              `into \`${branch}\`.`,
          }),
        });
        if (createPrRes.ok) {
          prUrl = (await createPrRes.json()).html_url as string;
        } else {
          // Non-fatal -- the commit itself already succeeded and is safely
          // sitting on the review branch; the PR is just a convenience on
          // top of that, and can be opened by hand on GitHub if this ever
          // fails (a permissions hiccup, a rate limit, etc.).
          console.error("GitHub PR creation failed:", await createPrRes.text());
        }
      }
    }

    return NextResponse.json({
      repoUrl: `https://github.com/${owner}/${repoName}`,
      htmlUrl: `https://github.com/${owner}/${repoName}`,
      prUrl,
    });
  } catch (err) {
    console.error("GitHub push error:", err);
    return NextResponse.json({ error: "Something went wrong pushing to GitHub." }, { status: 500 });
  }
}
