import { extendVideo, type VideoSegmentSeconds } from "@/lib/ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const seconds = (body.seconds ?? "4") as VideoSegmentSeconds;
  const prompt = body.prompt as string | undefined;

  try {
    const video = await extendVideo(id, seconds, prompt);
    return Response.json(video);
  } catch (error) {
    console.error("ChatGiza video extend error:", error);
    const message = error instanceof Error ? error.message : "Couldn't extend the video.";
    return Response.json({ error: message }, { status: 500 });
  }
}
