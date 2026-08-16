import { getVideoContent } from "@/lib/ai";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobileAuth";
import { isVideoOwner } from "@/lib/videoOwnership";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id ?? (await getMobileUserId(request));
  if (!userId) {
    return new Response("Not signed in.", { status: 401 });
  }

  const { id } = await params;

  if (!(await isVideoOwner(id, userId))) {
    return new Response("Not found.", { status: 404 });
  }

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
