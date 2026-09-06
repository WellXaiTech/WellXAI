import { generateImage, editImage } from "@/lib/ai";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkRateLimit } from "@/lib/rateLimit";

// High-quality image generation is real per-call cost -- unlike a chat
// message, there was previously no limit at all beyond "signed in",
// which is an unbounded-cost surface for any account.
const IMAGE_LIMIT_PER_10_MIN = 15;

// High-quality image generation (quality: "high") can take a while --
// without this, Vercel's platform default can kill the request before it
// finishes. Matches the same value already proven safe on this plan for
// /api/build/turn and /api/code/generate.
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(request));
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const rate = await checkRateLimit(`image:${userId}`, IMAGE_LIMIT_PER_10_MIN, 600);
  if (!rate.allowed) {
    return Response.json({ error: "You're generating images too quickly -- please slow down." }, { status: 429 });
  }

  const body = await request.json();
  const prompt = (body.prompt ?? "") as string;
  const editSourceUrl = body.editSourceUrl as string | undefined;

  if (!prompt.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const url = editSourceUrl ? await editImage(editSourceUrl, prompt.trim()) : await generateImage(prompt.trim());
    return Response.json({ url });
  } catch (error) {
    console.error("ChatGiza image error:", error);
    const message = error instanceof Error ? error.message : "Couldn't generate that image.";
    return Response.json({ error: message }, { status: 500 });
  }
}
