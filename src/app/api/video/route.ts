import { createVideo } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = (body.prompt ?? "") as string;

  if (!prompt.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const video = await createVideo(prompt.trim());
    return Response.json(video);
  } catch (error) {
    console.error("ChatGiza video error:", error);
    const message = error instanceof Error ? error.message : "Couldn't start video generation.";
    return Response.json({ error: message }, { status: 500 });
  }
}
