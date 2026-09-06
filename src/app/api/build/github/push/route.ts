import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";
import { getFreshConnectorToken } from "@/lib/connectors";
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

  const token = await getFreshConnectorToken(user.id, "github");
  if (!token) {
    return NextResponse.json({ error: "Connect GitHub first." }, { status: 400 });
  }
  const accessToken = token.accessToken;

  try {
    const meRes = await gh(accessToken, "/user");
    if (!meRes.ok) {
      return NextResponse.json({ error: "GitHub rejected the stored connection. Please reconnect GitHub." }, { status: 400 });
    }
    const me = await meRes.json();
    const owner = me.login as string;

    // Create the repo if it doesn't exist yet; treat "already exists" as
    // success rather than an error.
    const repoRes = await gh(accessToken, `/repos/${owner}/${repoName}`);
    if (repoRes.status === 404) {
      const createRes = await gh(accessToken, "/user/repos", {
        method: "POST",
        body: JSON.stringify({ name: repoName, private: isPrivate, auto_init: false }),
      });
      if (!createRes.ok) {
        const errBody = await createRes.text();
        console.error("GitHub repo creation failed:", createRes.status, errBody);
        return NextResponse.json({ error: "Could not create the GitHub repository." }, { status: 502 });
      }
    } else if (!repoRes.ok) {
      return NextResponse.json({ error: "Could not reach that GitHub repository." }, { status: 502 });
    }

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

    const updateRefRes = parentCommitSha
      ? await gh(accessToken, `/repos/${owner}/${repoName}/git/refs/heads/${branch}`, {
          method: "PATCH",
          body: JSON.stringify({ sha: commit.sha, force: false }),
        })
      : await gh(accessToken, `/repos/${owner}/${repoName}/git/refs`, {
          method: "POST",
          body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
        });
    if (!updateRefRes.ok) {
      console.error("GitHub ref update failed:", await updateRefRes.text());
      return NextResponse.json({ error: "Could not update the branch." }, { status: 502 });
    }

    return NextResponse.json({
      repoUrl: `https://github.com/${owner}/${repoName}`,
      htmlUrl: `https://github.com/${owner}/${repoName}`,
    });
  } catch (err) {
    console.error("GitHub push error:", err);
    return NextResponse.json({ error: "Something went wrong pushing to GitHub." }, { status: 500 });
  }
}
