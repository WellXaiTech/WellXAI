import { getVideoStatus } from "@/lib/ai";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const video = await getVideoStatus(id);
    return Response.json(video);
  } catch (error) {
    console.error("ChatGiza video status error:", error);
    return Response.json({ error: "Couldn't check video status." }, { status: 500 });
  }
}
