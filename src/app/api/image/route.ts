import { generateImage, editImage } from "@/lib/ai";

export async function POST(request: Request) {
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
