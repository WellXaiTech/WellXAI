import { getVideoContent } from "@/lib/ai";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const videoResponse = await getVideoContent(id);
    return new Response(videoResponse.body, {
      headers: { "Content-Type": "video/mp4" },
    });
  } catch (error) {
    console.error("ChatGiza video content error:", error);
    return new Response("Couldn't load video.", { status: 500 });
  }
}
