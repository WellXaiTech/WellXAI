import { getVideoStatus } from "@/lib/ai";
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
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;

  if (!(await isVideoOwner(id, userId))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const video = await getVideoStatus(id);
    return Response.json(video);
  } catch (error) {
    console.error("ChatGiza video status error:", error);
    return Response.json({ error: "Couldn't check video status." }, { status: 500 });
  }
}
