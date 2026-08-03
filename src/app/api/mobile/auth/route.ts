import { mintMobileToken } from "@/lib/mobileAuth";

// Verifies a Google ID token obtained natively (Android Credential Manager)
// the same way the web "google-one-tap" Credentials provider does (see
// src/auth.ts), then mints a bearer token the native app stores and sends
// as `Authorization: Bearer <token>` on every subsequent API call — there is
// no browser cookie for a native client to carry a session in.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== "string") {
    return Response.json({ error: "idToken is required" }, { status: 400 });
  }

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    return Response.json({ error: "Invalid Google token" }, { status: 401 });
  }
  const payload = await res.json();

  if (payload.aud !== process.env.AUTH_GOOGLE_ID) {
    return Response.json({ error: "Token audience mismatch" }, { status: 401 });
  }
  if (!payload.sub || !payload.email) {
    return Response.json({ error: "Incomplete Google profile" }, { status: 401 });
  }

  const token = await mintMobileToken({
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  });

  return Response.json({
    token,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      image: payload.picture ?? null,
    },
  });
}
