import { NextRequest, NextResponse } from "next/server";
import { startSso } from "@/lib/sso";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter your work email" }, { status: 400 });
  }

  try {
    const result = await startSso(email);
    if (!result) {
      return NextResponse.json({ error: "No SSO connection is set up for that email's domain" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("SSO start error:", err);
    return NextResponse.json({ error: "Couldn't start SSO sign-in" }, { status: 500 });
  }
}
