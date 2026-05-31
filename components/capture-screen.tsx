"use client";

import { useCallback, useRef, useState } from "react";
import { CameraFeed, type CameraFeedHandle } from "@/components/camera-feed";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
  type TrackingStatus,
} from "@/components/drawing-canvas";
import type { Mood } from "@/lib/moods";

type CaptureScreenProps = {
  mood: Mood;
  onBack: () => void;
  onCapture: (payload: {
    capturedImageDataUrl: string | null;
    drawingDataUrl: string;
  }) => void;
};

export function CaptureScreen({ mood, onBack, onCapture }: CaptureScreenProps) {
  const cameraRef = useRef<CameraFeedHandle>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");

  const handleStartTracing = () => {
    setIsTracing(true);
  };

  const handleDone = () => {
    setIsTracing(false);
    const dataUrl = canvasRef.current?.getDataUrl();
    if (!dataUrl) return;
    onCapture({
      capturedImageDataUrl: cameraRef.current?.captureFramePng() ?? null,
      drawingDataUrl: dataUrl,
    });
  };

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
    setHasDrawing(false);
  };

  const statusLabel =
    trackingMessage ||
    (isTracing ? "Starting air tracing…" : "When it feels right, start tracing.");
  

  const handleTrackingStatusChange = useCallback(
  (status: TrackingStatus, message: string) => {
    setTrackingStatus(status);
    setTrackingMessage(message);
  },
  [],
);

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[#f8f6f1]">
      <header className="relative z-30 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
      <img
       src="/doodles/logo.png"
       alt="Puff Note"
       className="h-18 w-18 object-contain"
      />
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/25 bg-[#bfd7f0] px-4 py-1.5 text-sm tracking-wide text-white backdrop-blur-sm transition hover:bg[#bfd7f0]+20 active:scale-95"
        >
          Back
        </button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
      <CameraFeed ref={cameraRef} moodId={mood.id} videoRef={videoRef} />

      <div className="pointer-events-none absolute inset-0 z-10 h-full w-full">
        <DrawingCanvas
          ref={canvasRef}
          className="h-full w-full"
          tracingActive={isTracing}
          videoRef={videoRef}
          mirrorX={false}
          onDrawingChange={setHasDrawing}
          onTrackingStatusChange={handleTrackingStatusChange}
        />
      </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="font-serif text-xl leading-snug tracking-wide text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)] sm:text-xl">
            {isTracing ? "Trace what you feel." : "Frame a moment."}
          </p>
          <p className="font-serif text-l leading-snug tracking-wide text-white/75 drop-shadow-[0_2px_12px_rgba(0,0,0,0.2)] sm:text-l">
            {isTracing
              ? "Move your index finger through the air."
              : "When it feels right, start tracing."}
          </p>
          {isTracing ? (
            <p className="text-sm tracking-wide text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              Draw slowly so Puff Note can follow.
            </p>
          ) : null}
        </div>

        {isTracing ? (
          <div className="pointer-events-none absolute left-4 top-4 z-30 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-xs tracking-wide text-white/90 backdrop-blur-sm">
            {trackingStatus === "unavailable"
              ? "Air tracing unavailable"
              : statusLabel}
          </div>
        ) : null}
      </div>

      <footer className="relative z-30 flex shrink-0 gap-3 border-t border-white/10 bg-[#f8f6f1] px-4 py-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-full border border-[white]/20 bg-[#bfd7f0] py-3.5 text-sm font-medium tracking-[0.12em] text-white transition hover:bg-white/15 active:scale-[0.98]"
        >
          Back
        </button>
        {isTracing ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawing}
            className="flex-1 rounded-full border border-[#bfd7f0] bg-white/30 py-5 text-sm font-medium tracking-[0.12em] text-[#bfd7f0] transition enabled:hover:bg-white/15 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clear
          </button>
        ) : null}
        {!isTracing ? (
          <button
            type="button"
            onClick={handleStartTracing}
            className="flex-[1.25] rounded-full border border-white/30 bg-white py-3.5 text-sm font-medium tracking-[0.12em] text-[var(--puff-ink)] transition hover:bg-white/90 active:scale-[0.98]"
          >
            Start tracing
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDone}
            disabled={!hasDrawing || trackingStatus === "unavailable"}
            className="flex-1 rounded-full border border-white/30 bg-white py-3.5 text-sm font-medium tracking-[0.12em] text-[var(--puff-ink)] transition enabled:hover:bg-white/90 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Done
          </button>
        )}
      </footer>
    </div>
  );
}
