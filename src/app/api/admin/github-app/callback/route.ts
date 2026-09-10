import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { saveGithubAppConfig } from "@/lib/githubApp";

// GitHub redirects here (the manifest's redirect_url) with a one-time
// `code` after the admin confirms "Create GitHub App". Converting it is
// the ONLY step that returns the actual credentials (including the
// private key) -- they're never shown anywhere else, so this must
// capture and store them immediately.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const res = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("GitHub app-manifest conversion failed:", res.status, body);
    return NextResponse.json({ error: "Conversion failed", status: res.status, body }, { status: 502 });
  }
  const data = await res.json();

  await saveGithubAppConfig({
    appId: String(data.id),
    slug: data.slug as string,
    privateKey: data.pem as string,
    clientId: data.client_id as string,
    clientSecret: data.client_secret as string,
    webhookSecret: data.webhook_secret as string | undefined,
    htmlUrl: data.html_url as string,
    createdAt: Date.now(),
  });

  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>GitHub App created</title></head>
<body style="font-family:-apple-system,Roboto,sans-serif;max-width:520px;margin:60px auto;line-height:1.6">
<h1>Done -- "${data.name}" is live</h1>
<p>Saved to KV. ChatGiZa's "Connect GitHub" now uses this app automatically -- nothing else to configure or redeploy.</p>
<p><a href="${data.html_url}">View the app on GitHub</a> (install URL: <code>https://github.com/apps/${data.slug}/installations/new</code>)</p>
</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
