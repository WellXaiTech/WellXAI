import { kv } from "@vercel/kv";

// The video/[id] endpoints identify a video purely by OpenAI's own Sora
// video id, which is guessable/observable (URLs, logs, screenshots) and
// carries no owner info of its own -- so without a side record of who
// created it, any of those endpoints would let anyone check status,
// download the finished clip, or trigger a paid "extend" call on someone
// else's video. This records that mapping at creation time so the route
// handlers can check it.
function ownerKey(videoId: string) {
  return `chatgiza:video-owner:${videoId}`;
}

export async function recordVideoOwner(videoId: string, userId: string): Promise<void> {
  await kv.set(ownerKey(videoId), userId);
}

export async function isVideoOwner(videoId: string, userId: string): Promise<boolean> {
  const owner = await kv.get<string>(ownerKey(videoId));
  return owner === userId;
}
