const MAX_FRAMES = 8;
const MAX_DURATION_SECONDS = 300; // 5 minutes

/** Extracts a handful of evenly-spaced frames from a video file as PNG data
 * URLs, entirely client-side (an offscreen <video> element seeked to each
 * timestamp, drawn to a <canvas>) -- no ffmpeg or server round-trip needed.
 * A vision model reads these frames the same way it reads any other
 * attached image, same as the PDF extractor's scanned-page fallback. */
export async function extractVideoFrames(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Couldn't read this video file"));
    });

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) {
      throw new Error("Couldn't read this video file — it has no readable duration.");
    }
    if (duration > MAX_DURATION_SECONDS) {
      throw new Error(`This video is too long (max ${MAX_DURATION_SECONDS / 60} minutes for analysis).`);
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't read this video file.");

    const frameCount = Math.min(MAX_FRAMES, Math.max(1, Math.ceil(duration)));
    const frames: string[] = [];

    for (let i = 0; i < frameCount; i++) {
      // Spread across the middle 90% of the clip so we don't just grab
      // near-identical frames from a fade-in/fade-out at the very edges.
      const t = duration * (0.05 + (0.9 * i) / Math.max(1, frameCount - 1));
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("Couldn't read this video file"));
        video.currentTime = Math.min(t, Math.max(0, duration - 0.05));
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.85));
    }

    if (frames.length === 0) {
      throw new Error("Couldn't extract any frames from this video.");
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}
