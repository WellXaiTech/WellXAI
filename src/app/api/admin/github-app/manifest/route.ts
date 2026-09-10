import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

// One-time setup, run by hand by whoever administers the WellXAI GitHub
// org -- not part of any regular user flow. Visiting this (while signed
// into ChatGiZa as an admin, per ADMIN_EMAILS) renders a self-submitting
// form implementing GitHub's "manifest flow"
// (https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest):
// GitHub can only accept a new app's definition as a real browser POST,
// not a query string, so this can't just be a link.
//
// Submits under the WellXaiTech organization (where the real project
// repos already live) rather than a personal account -- change the
// action URL below to `https://github.com/settings/apps/new` first if a
// personal account is preferred instead.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const manifest = {
    name: "ChatGiZa",
    url: "https://chatgiza.com",
    hook_attributes: { url: `${origin}/api/admin/github-app/webhook`, active: false },
    // Where GitHub sends the one-time manifest-conversion code once the
    // admin clicks "Create GitHub App" below.
    redirect_url: `${origin}/api/admin/github-app/callback`,
    // Where GitHub sends each individual END USER back to after THEY
    // install this app on their own account/org (see
    // api/connectors/github/callback's installation_id branch) --
    // reused as the fixed "Setup URL" since a GitHub App has no
    // per-request redirect_uri the way classic OAuth does.
    setup_url: `${origin}/api/connectors/github/callback`,
    setup_on_update: true,
    public: true,
    default_permissions: {
      contents: "write",
      metadata: "read",
      // Lets the app create brand-new repos under an ORGANIZATION
      // installation (POST /orgs/{org}/repos) -- GitHub does not permit
      // this at all for a personal-account installation regardless of
      // permission level, which is why repo creation on a personal
      // account still falls back to the classic OAuth connector (see
      // the push route).
      administration: "write",
    },
    default_events: [] as string[],
  };

  const state = crypto.randomUUID();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Create ChatGiZa GitHub App</title></head>
<body>
<p>Redirecting to GitHub to create the app&hellip;</p>
<form id="f" action="https://github.com/organizations/WellXaiTech/settings/apps/new?state=${state}" method="post">
  <input type="hidden" name="manifest" value='${JSON.stringify(manifest).replace(/'/g, "&#39;")}'>
</form>
<script>document.getElementById('f').submit();</script>
</body></html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
