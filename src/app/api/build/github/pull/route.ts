import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestUser";
import { hasBuildAccess } from "@/lib/usageLimit";
import { getFreshConnectorToken } from "@/lib/connectors";
import { getUserInstallation, mintInstallationToken } from "@/lib/githubApp";

const GITHUB_API = "https://api.github.com";

async function gh(token: string, path: string) {
  return fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
}

// Extensions that would just come through as corrupted/useless text if
// decoded as UTF-8 -- skipped rather than pulled in and mangled. This
// mirrors the app's own scope (BuildProject.files is a text-file map;
// write_file only ever writes text), not an attempt at general binary
// support.
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "svg",
  "woff", "woff2", "ttf", "otf", "eot",
  "mp3", "mp4", "wav", "ogg", "webm", "mov", "avi",
  "zip", "gz", "tar", "rar", "7z",
  "pdf", "exe", "dll", "so", "bin",
]);

function isLikelyBinary(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();
  return !!ext && BINARY_EXTENSIONS.has(ext);
}

// Caps how much of a real repo gets pulled into a single ChatGiZa
// project in one go -- generous enough for a real small-to-medium
// project, small enough that importing someone's huge existing
// monorepo can't hang this request or blow past the same file-count/
// size ceilings validateBuildFiles enforces on the way back out.
const MAX_IMPORTED_FILES = 200;

// The read side of the GitHub connection -- pulls an existing repo's
// current file tree into a fresh ChatGiZa project (see
// BuildWorkspace.tsx's startNewChatInGroup), the one direction
// push_to_github/syncFilesToGithub never covered. Without this,
// "continuing" a real existing repo through ChatGiZa started from a
// blank slate that had no idea what was already there -- at best
// confusing, at worst an eventual overwrite of real content the next
// time something pushed.
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await hasBuildAccess(user.id))) {
    return NextResponse.json({ error: "The Build page requires a Growth or Enterprise plan." }, { status: 403 });
  }

  const repoName = new URL(req.url).searchParams.get("repoName");
  if (!repoName) {
    return NextResponse.json({ error: "repoName is required" }, { status: 400 });
  }

  const [installation, classicToken] = await Promise.all([
    getUserInstallation(user.id),
    getFreshConnectorToken(user.id, "github"),
  ]);
  const installationToken = installation ? await mintInstallationToken(installation.installationId) : null;
  const token = installationToken ?? classicToken?.accessToken ?? null;
  if (!token) {
    return NextResponse.json({ error: "Connect GitHub first." }, { status: 400 });
  }

  try {
    let owner: string;
    if (installation) {
      owner = installation.accountLogin;
    } else {
      const meRes = await gh(token, "/user");
      if (!meRes.ok) {
        return NextResponse.json({ error: "GitHub rejected the stored connection. Please reconnect GitHub." }, { status: 400 });
      }
      owner = (await meRes.json()).login as string;
    }

    const repoRes = await gh(token, `/repos/${owner}/${repoName}`);
    if (!repoRes.ok) {
      // A brand-new repo (nothing pushed yet) is not an error -- there's
      // simply nothing to import.
      if (repoRes.status === 404) return NextResponse.json({ files: {} });
      return NextResponse.json({ error: "Could not reach that GitHub repository." }, { status: 502 });
    }
    const repoData = await repoRes.json();
    // Prefer the "chatgiza-updates" review branch (see api/build/github/
    // push/route.ts) over the default branch when it exists -- it holds
    // whatever ChatGiZa most recently built, including changes still
    // waiting in an unmerged PR. Importing only ever from the default
    // branch would make reopening a project look like the AI's last
    // round of edits had vanished, when really they're just pending
    // review on GitHub.
    const REVIEW_BRANCH = "chatgiza-updates";
    let branch = repoData.default_branch as string;
    const reviewRefCheck = await gh(token, `/repos/${owner}/${repoName}/git/ref/heads/${REVIEW_BRANCH}`);
    if (reviewRefCheck.ok) branch = REVIEW_BRANCH;

    const refRes = await gh(token, `/repos/${owner}/${repoName}/git/ref/heads/${branch}`);
    if (!refRes.ok) return NextResponse.json({ files: {} }); // empty repo, no commits yet
    const refData = await refRes.json();

    const commitRes = await gh(token, `/repos/${owner}/${repoName}/git/commits/${refData.object.sha}`);
    if (!commitRes.ok) return NextResponse.json({ files: {} });
    const commitData = await commitRes.json();

    const treeRes = await gh(token, `/repos/${owner}/${repoName}/git/trees/${commitData.tree.sha}?recursive=1`);
    if (!treeRes.ok) {
      return NextResponse.json({ error: "Could not read the repository's file tree." }, { status: 502 });
    }
    const treeData = await treeRes.json();
    const blobs = (treeData.tree as { path: string; type: string; sha: string; size?: number }[]).filter(
      (entry) => entry.type === "blob" && !isLikelyBinary(entry.path)
    );
    const truncated = blobs.length > MAX_IMPORTED_FILES;
    const selected = blobs.slice(0, MAX_IMPORTED_FILES);

    const files: Record<string, string> = {};
    await Promise.all(
      selected.map(async (entry) => {
        const blobRes = await gh(token, `/repos/${owner}/${repoName}/git/blobs/${entry.sha}`);
        if (!blobRes.ok) return;
        const blobData = await blobRes.json();
        if (blobData.encoding === "base64") {
          try {
            files[entry.path] = Buffer.from(blobData.content, "base64").toString("utf-8");
          } catch {
            // not valid UTF-8 (a binary file our extension filter missed) -- skip it
          }
        }
      })
    );

    return NextResponse.json({ files, truncated });
  } catch (err) {
    console.error("GitHub pull error:", err);
    return NextResponse.json({ error: "Something went wrong pulling from GitHub." }, { status: 500 });
  }
}
