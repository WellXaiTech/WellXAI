"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtimeVision } from "@/lib/realtimeVision";
import { PREMIUM_VOICE_NAMES, type PremiumVoiceName } from "@/lib/voice";

const CloseIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const MicIcon = ({ muted }: { muted: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
    {muted && <path d="M3 3l18 18" />}
  </svg>
);
const CameraIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const FRAME_INTERVAL_MS = 1500;

export default function LiveVisionPanel({ onClose }: { onClose: () => void }) {
  const rt = useRealtimeVision();
  const [micMuted, setMicMutedState] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [voice, setVoice] = useState<PremiumVoiceName>("marin");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      rt.stop();
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoRef.current && rt.cameraStream) {
      videoRef.current.srcObject = rt.cameraStream;
    }
  }, [rt.cameraStream]);

  useEffect(() => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (rt.connectionState !== "listening" || !rt.cameraStream) return;

    frameTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      rt.sendFrame(canvas.toDataURL("image/jpeg", 0.7));
    }, FRAME_INTERVAL_MS);

    return () => {
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt.connectionState, rt.cameraStream]);

  function toggleMic() {
    const next = !micMuted;
    setMicMutedState(next);
    rt.setMicMuted(next);
  }

  async function handleConnect() {
    await rt.start({ voice, camera: cameraOn });
  }

  const connected = rt.connectionState === "listening";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-4 sm:px-10">
        <h1 className="font-serif text-2xl">Live Voice</h1>
        <button
          onClick={() => {
            rt.stop();
            onClose();
          }}
          aria-label="Close"
          className="rounded-full p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {CloseIcon}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        {rt.cameraStream && (
          <video ref={videoRef} autoPlay playsInline muted className="max-h-64 w-full max-w-sm rounded-2xl bg-black object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />

        <div
          className={`flex h-32 w-32 items-center justify-center rounded-full border-2 transition-colors ${
            rt.isAiSpeaking ? "border-foreground animate-pulse" : "border-border"
          }`}
        >
          <span className="text-sm text-muted">
            {rt.connectionState === "idle" && "Not connected"}
            {rt.connectionState === "connecting" && "Connecting…"}
            {rt.connectionState === "listening" && (rt.isAiSpeaking ? "Speaking…" : "Listening…")}
          </span>
        </div>

        {rt.errorMessage && <p className="max-w-sm text-center text-sm text-red-500">{rt.errorMessage}</p>}

        {!connected ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted">Voice</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value as PremiumVoiceName)}
                className="rounded-lg border border-border bg-surface px-2 py-1 text-sm outline-none"
              >
                {PREMIUM_VOICE_NAMES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <label className="ml-3 flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" checked={cameraOn} onChange={(e) => setCameraOn(e.target.checked)} />
                Use camera
              </label>
            </div>
            <button
              onClick={handleConnect}
              disabled={rt.connectionState === "connecting"}
              className="rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {rt.connectionState === "connecting" ? "Connecting…" : "Start live conversation"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMic}
              aria-label={micMuted ? "Unmute" : "Mute"}
              className={`flex h-14 w-14 items-center justify-center rounded-full border transition-colors ${
                micMuted ? "border-[#b3413e] text-[#b3413e]" : "border-border text-foreground hover:bg-surface-2"
              }`}
            >
              <MicIcon muted={micMuted} />
            </button>
            {rt.cameraStream && (
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-muted">
                {CameraIcon}
              </span>
            )}
            <button
              onClick={() => {
                rt.stop();
              }}
              className="rounded-full bg-[#b3413e] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              End
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
