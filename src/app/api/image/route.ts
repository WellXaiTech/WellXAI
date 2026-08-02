import { generateImage, editImage } from "@/lib/ai";
import { auth } from "@/auth";
import { isPaidAccount, checkIpFreeLimit, recordIpUsage } from "@/lib/usageLimit";

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = (body.prompt ?? "") as string;
  const editSourceUrl = body.editSourceUrl as string | undefined;

  if (!prompt.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const session = await auth();
  const paid = await isPaidAccount(session?.user?.id);
  const blockedMessage = await checkIpFreeLimit(request.headers, paid);
  if (blockedMessage) {
    return Response.json({ error: blockedMessage }, { status: 403 });
  }
  await recordIpUsage(request.headers, paid);

  try {
    const url = editSourceUrl ? await editImage(editSourceUrl, prompt.trim()) : await generateImage(prompt.trim());
    return Response.json({ url });
  } catch (error) {
    console.error("ChatGiza image error:", error);
    const message = error instanceof Error ? error.message : "Couldn't generate that image.";
    return Response.json({ error: message }, { status: 500 });
  }
}
