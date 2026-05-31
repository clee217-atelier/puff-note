"use client";

import { useCallback, useRef, useState } from "react";

import { CameraFeed, type CameraFeedHandle } from "@/components/camera-feed";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
  type TrackingStatus,
} from "@/components/drawing-canvas";
import type { Mood } from "@/lib/moods";

const TRACE_COLORS = [
  {
    id: "cream",
    label: "Cream",
    value: "rgba(255, 250, 238, 0.72)",
  },
  {
    id: "blue",
    label: "Blue",
    value: "rgba(95, 136, 201, 0.72)",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    value: "rgba(28, 28, 28, 0.62)",
  },
  {
    id: "blush",
    label: "Blush",
    value: "rgba(245, 184, 198, 0.7)",
  },
  {
    id: "butter",
    label: "Butter",
    value: "rgba(255, 222, 132, 0.72)",
  },
] as const;

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
  const [trackingStatus, setTrackingStatus] =
    useState<TrackingStatus>("idle");

  const [selectedTraceColor, setSelectedTraceColor] = useState<string>(
    TRACE_COLORS[0].value,
  );

  const [showTraceColorPicker, setShowTraceColorPicker] = useState(false);

  const fingerDetected = trackingStatus === "detected";
  const fingerLost = trackingStatus === "lost";
  const tracingBroken = isTracing && fingerLost;

  const handleBack = () => {
    if (isTracing) {
      setIsTracing(false);
      setHasDrawing(false);
      canvasRef.current?.clearCanvas();
      return;
    }

    onBack();
  };

  const handleStartTracing = () => {
    canvasRef.current?.clearCanvas();
    setHasDrawing(false);
    setShowTraceColorPicker(false);
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

  const handleTrackingStatusChange = useCallback(
    (status: TrackingStatus, _message: string) => {
      setTrackingStatus(status);
    },
    [],
  );

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[#f8f6f1]">
      <header className="relative z-30 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
        <img
          src="/doodles/logo.png"
          alt="Puff Note"
          className="h-20 w-20 object-contain"
        />

        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-white/25 bg-white px-4 py-1.5 font-crayon text-ml tracking-wide text-[var(--puff-ink)] backdrop-blur-sm transition hover:bg-[#bfd7f0]/20 active:scale-95"
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
            detectionActive
            tracingActive={isTracing}
            traceColor={selectedTraceColor}
            videoRef={videoRef}
            mirrorX={false}
            onDrawingChange={setHasDrawing}
            onTrackingStatusChange={handleTrackingStatusChange}
          />
        </div>

        {!isTracing ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-8 text-center">
            <div className="pointer-events-auto relative flex flex-col items-center gap-1">
            {!fingerDetected && !showTraceColorPicker ? (
                <p className="mb-[-2rem] font-crayon text-[10px] uppercase tracking-[0.2em] text-white transition-all duration-500 ease-out">
                  Tap cloud to change color
                </p>
              ) : null}
            <button
                type="button"
                onClick={() => setShowTraceColorPicker((current) => !current)}
                aria-label="Choose trace colour"
                className={[
                  "relative grid h-28 w-32 place-items-center transition-all duration-500 ease-out active:scale-95",
                  fingerDetected ? "scale-100 opacity-100" : "scale-95 opacity-90",
                ].join(" ")}
                style={{ color: selectedTraceColor }}
              >
                {/* cloud colour picker */}
                <svg
                  viewBox="0 0 96 50"
                  className="h-20 w-24 drop-shadow-[0_3px_14px_rgba(0,0,0,0.28)] transition-all duration-500 ease-out"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M18 47C9 36 18 23 34 26C39 9 66 12 70 32C83 31 91 42 84 54C76 68 52 62 44 56C34 66 23 59 18 47Z"
                    fill="currentColor"
                    stroke="#f8f6f1"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {showTraceColorPicker ? (
                <div className="absolute left-[78px] top-[-34px] h-[150px] w-[110px]">
                  {TRACE_COLORS.map((color, index) => {
                    const selected = selectedTraceColor === color.value;

                    const positions = [
                      "left-[-80px] top-[40px]",
                      "left-[-40px] top-[10px]",
                      "left-[10px] top-[20px]",
                      "left-[50px] top-[50px]",
                      "left-[70px] top-[100px]",
                    ];

                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => {
                          setSelectedTraceColor(color.value);
                          setShowTraceColorPicker(false);
                        }}
                        aria-label={`Use ${color.label} trace`}
                        className={[
                          "puff-color-dot absolute grid h-8 w-8 place-items-center rounded-full border transition-all duration-300 ease-out active:scale-90",
                          positions[index],
                          selected
                            ? "border-white ring-2 ring-white"
                            : "border-white/70",
                        ].join(" ")}
                        style={{
                          backgroundColor: color.value,
                          animationDelay: `${index * 70}ms`,
                        }}
                      >
                        {selected ? (
                          <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_0_1px_rgba(28,28,28,0.2)]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <p className="rounded-full bg-white/30 px-5 py-2 font-crayon text-[12px] uppercase tracking-[0.28em] text-white backdrop-blur-[4px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-all duration-500 ease-out">
                {fingerDetected ? "Finger Detected" : "Point Finger"}
              </p>
            </div>
          </div>
        ) : null}

        {isTracing ? (
          <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-6">
            <p
              className={[
                "max-w-[280px] rounded-full bg-white/30 px-4 py-2 text-center font-crayon text-[11px] leading-relaxed tracking-[0.12em] text-white backdrop-blur-[4px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-all duration-500 ease-out",
                tracingBroken
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-2 opacity-0",
              ].join(" ")}
            >
              Draw slowly so Puff Note can follow
            </p>
          </div>
        ) : null}
      </div>

      <footer className="relative z-30 flex shrink-0 gap-3 border-t border-white/10 bg-[#f8f6f1] px-4 py-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={handleBack}
          className="flex-[1.25] rounded-full border border-white/30 bg-white py-3.5 font-crayon tracking-[0.12em] text-[var(--puff-ink)] transition hover:bg-white/90 active:scale-[0.98]"
        >
          Back
        </button>

        {isTracing ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawing}
            className="flex-1 rounded-full border border-[#3f78bf] bg-white/30 py-5 font-crayon text-sm tracking-[0.12em] text-[#3f78bf] transition enabled:hover:bg-white/15 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clear
          </button>
        ) : null}

        {!isTracing ? (
          <button
            type="button"
            onClick={handleStartTracing}
            className={[
              "flex-[1.25] rounded-full border py-3.5 font-crayon tracking-[0.12em] transition active:scale-[0.98]",
              fingerDetected
                ? "border-[#5F88C9] bg-[#5F88C9] text-white"
                : "border-white/30 bg-white text-[var(--puff-ink)]",
            ].join(" ")}
          >
            Start Tracing
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDone}
            disabled={!hasDrawing || trackingStatus === "unavailable"}
            className="flex-1 rounded-full border border-white/30 bg-[#3f78bf] py-3.5 font-crayon tracking-[0.12em] text-white transition enabled:hover:bg-white/90 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Done
          </button>
        )}
      </footer>
    </div>
  );
}