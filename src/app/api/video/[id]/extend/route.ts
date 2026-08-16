import { extendVideo, type VideoSegmentSeconds } from "@/lib/ai";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { isVideoOwner, recordVideoOwner } from "@/lib/videoOwnership";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(request));
  if (!userId) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;

  if (!(await isVideoOwner(id, userId))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const seconds = (body.seconds ?? "4") as VideoSegmentSeconds;
  const prompt = body.prompt as string | undefined;

  try {
    const video = await extendVideo(id, seconds, prompt);
    // The extended clip gets a new id from OpenAI -- record its owner too,
    // otherwise a second extend (or checking status/downloading it) would
    // fail the ownership check even for the same user who just made it.
    await recordVideoOwner(video.id, userId);
    return Response.json(video);
  } catch (error) {
    console.error("ChatGiza video extend error:", error);
    const message = error instanceof Error ? error.message : "Couldn't extend the video.";
    return Response.json({ error: message }, { status: 500 });
  }
}
