import { createVideo } from "@/lib/ai";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { recordVideoOwner } from "@/lib/videoOwnership";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(request));
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();
  const prompt = (body.prompt ?? "") as string;

  if (!prompt.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const video = await createVideo(prompt.trim());
    await recordVideoOwner(video.id, userId);
    return Response.json(video);
  } catch (error) {
    console.error("ChatGiza video error:", error);
    const message = error instanceof Error ? error.message : "Couldn't start video generation.";
    return Response.json({ error: message }, { status: 500 });
  }
}
