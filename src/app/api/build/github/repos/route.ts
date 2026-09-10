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

export type RemoteRepo = { name: string; url: string; private: boolean; updatedAt: string };

// Lists every repo the connection can currently see, so History can show
// a folder for repos the user already has on GitHub even before they've
// ever opened one through ChatGiZa (see BuildWorkspace.tsx's
// remoteGithubRepos) -- everything else GitHub-related here only ever
// dealt with repos ChatGiZa itself had already touched.
//
// Capped at 300 (3 pages of 100) -- generous for a real account, but
// this is a sidebar list, not a repo browser; nothing here needs to
// handle someone's 5,000-repo org.
const MAX_REPOS = 300;
const PER_PAGE = 100;

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!(await hasBuildAccess(user.id))) {
    return NextResponse.json({ error: "The Build page requires a Growth or Enterprise plan." }, { status: 403 });
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
    const repos: RemoteRepo[] = [];
    // An installation's own /installation/repositories respects exactly
    // what it was scoped to at install time ("All repositories" or a
    // specific selection) -- the right list to show, rather than
    // /user/repos, which would ignore that scoping entirely.
    const basePath = installation ? "/installation/repositories" : "/user/repos";
    for (let page = 1; repos.length < MAX_REPOS; page++) {
      const res = await gh(token, `${basePath}?per_page=${PER_PAGE}&page=${page}`);
      if (!res.ok) {
        if (page === 1) {
          return NextResponse.json({ error: "Could not list repositories from GitHub." }, { status: 502 });
        }
        break;
      }
      const data = await res.json();
      const batch = (installation ? data.repositories : data) as {
        name: string;
        html_url: string;
        private: boolean;
        updated_at: string;
      }[];
      if (!batch || batch.length === 0) break;
      for (const r of batch) {
        repos.push({ name: r.name, url: r.html_url, private: r.private, updatedAt: r.updated_at });
      }
      if (batch.length < PER_PAGE) break;
    }
    repos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ repos: repos.slice(0, MAX_REPOS) });
  } catch (err) {
    console.error("GitHub repos list error:", err);
    return NextResponse.json({ error: "Something went wrong listing repositories." }, { status: 500 });
  }
}
