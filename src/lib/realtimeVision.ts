"use client";

import { useCallback, useRef, useState } from "react";
import type { PremiumVoiceName } from "@/lib/voice";

export type RealtimeConnectionState = "idle" | "connecting" | "listening";

type StartOptions = {
  language?: string;
  voice?: PremiumVoiceName;
  pushToTalk?: boolean;
  camera?: boolean;
};

// Web counterpart to the Android app's RealtimeVisionController -- same
// backend (/api/realtime/session mints a short-lived OpenAI client secret)
// and the same event protocol (conversation.item.create for camera frames,
// input_audio_buffer.* for push-to-talk), but connects over WebRTC instead
// of a raw WebSocket + manual PCM capture: the browser has no direct
// AudioRecord/AudioTrack equivalent, and WebRTC is what OpenAI's Realtime
// API itself recommends for browser clients -- it hands mic capture, audio
// encoding, and jitter-buffered playback to the browser/OS instead of us
// having to reimplement all of that by hand in JS.
export function useRealtimeVision() {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const pushToTalkRef = useRef(false);

  const stop = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }
    setConnectionState("idle");
    setIsAiSpeaking(false);
  }, []);

  const handleServerEvent = useCallback(
    (raw: string) => {
      let event: { type?: string; error?: { message?: string } };
      try {
        event = JSON.parse(raw);
      } catch {
        return;
      }
      switch (event.type) {
        case "response.created":
          setIsAiSpeaking(true);
          break;
        case "response.done":
          setIsAiSpeaking(false);
          break;
        // Server-side VAD fires this the instant it hears the user start
        // talking -- it also auto-interrupts the in-progress response on
        // OpenAI's end, so this is purely a local UI-state update.
        case "input_audio_buffer.speech_started":
          setIsAiSpeaking(false);
          break;
        case "error":
          setErrorMessage(event.error?.message ?? "Realtime error");
          break;
      }
    },
    []
  );

  const start = useCallback(
    async (opts: StartOptions = {}) => {
      if (connectionState !== "idle") return;
      setConnectionState("connecting");
      setErrorMessage(null);
      pushToTalkRef.current = !!opts.pushToTalk;

      try {
        const sessionRes = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: opts.language ?? "",
            voice: opts.voice ?? "marin",
            pushToTalk: !!opts.pushToTalk,
          }),
        });
        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || !sessionData.value) {
          throw new Error(sessionData.error ?? "Couldn't start a live session");
        }
        const ephemeralKey = sessionData.value as string;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioElRef.current = audioEl;
        pc.ontrack = (e) => {
          audioEl.srcObject = e.streams[0];
        };

        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = mic;
        const micTrack = mic.getAudioTracks()[0];
        // Push-to-talk starts muted -- the caller opens it via setMicMuted(false)
        // only while the talk button is held.
        if (opts.pushToTalk) micTrack.enabled = false;
        pc.addTrack(micTrack, mic);

        if (opts.camera) {
          // Video isn't sent as a live WebRTC track -- the model only ever
          // sees periodic still frames via sendFrame(), same as the Android
          // app. This stream just drives the on-screen camera preview the
          // caller captures frames from.
          const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).catch(() => null);
          if (camStream) {
            cameraStreamRef.current = camStream;
            setCameraStream(camStream);
          }
        }

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.addEventListener("message", (e) => handleServerEvent(e.data));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const answerRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=gpt-realtime`, {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        });
        if (!answerRes.ok) throw new Error("Couldn't connect to the live voice service");
        const answerSdp = await answerRes.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

        setConnectionState("listening");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Couldn't start a live session");
        stop();
      }
    },
    [connectionState, handleServerEvent, stop]
  );

  const setMicMuted = useCallback((muted: boolean) => {
    const track = micStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
  }, []);

  const endPushToTalk = useCallback(() => {
    setMicMuted(true);
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") {
      dc.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      dc.send(JSON.stringify({ type: "response.create" }));
    }
  }, [setMicMuted]);

  const beginPushToTalk = useCallback(() => {
    if (!pushToTalkRef.current) return;
    setMicMuted(false);
  }, [setMicMuted]);

  /** Sends one camera frame (JPEG data URL) as a still image, same shape as
   * the Android app -- "live video" here means periodic stills, not an
   * actual video codec stream. */
  const sendFrame = useCallback((jpegDataUrl: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_image", image_url: jpegDataUrl }],
        },
      })
    );
  }, []);

  return {
    connectionState,
    isAiSpeaking,
    errorMessage,
    cameraStream,
    start,
    stop,
    setMicMuted,
    beginPushToTalk,
    endPushToTalk,
    sendFrame,
  };
}
