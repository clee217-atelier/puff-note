"use client";

import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const INDEX_FINGER_TIP = 8;
const MAX_JUMP_RATIO = 0.75;
const LOST_FRAME_GRACE = 8;
const MIN_DRAW_DISTANCE = 3.2;

export type TrackingStatus =
  | "idle"
  | "loading"
  | "ready"
  | "detected"
  | "lost"
  | "unavailable";

export type DrawingCanvasHandle = {
  clearCanvas: () => void;
  getDataUrl: () => string | null;
  hasDrawing: () => boolean;
  clear: () => void;
  exportPng: () => string | null;
};

type DrawingCanvasProps = {
  className?: string;
  detectionActive?: boolean;
  tracingActive: boolean;
  traceColor?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mirrorX?: boolean;
  onDrawingChange?: (hasDrawing: boolean) => void;
  onTrackingStatusChange?: (status: TrackingStatus, message: string) => void;
};

type Point = {
  x: number;
  y: number;
};

function distance(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas(
    {
      className = "",
      detectionActive = false,
      tracingActive,
      traceColor = "rgba(255, 250, 238, 0.72)",
      videoRef,
      mirrorX = false,
      onDrawingChange,
      onTrackingStatusChange,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    const handLandmarkerRef = useRef<HandLandmarker | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const previousPointRef = useRef<Point | null>(null);
    const lastMidPointRef = useRef<Point | null>(null);

    const lostFrameCountRef = useRef(0);
    const isDetectingRef = useRef(false);
    const hasDrawingRef = useRef(false);
    const lastVideoTimeRef = useRef(-1);
    const initStartedRef = useRef(false);

    const onDrawingChangeRef = useRef(onDrawingChange);
    const onTrackingStatusChangeRef = useRef(onTrackingStatusChange);

    useEffect(() => {
      onDrawingChangeRef.current = onDrawingChange;
    }, [onDrawingChange]);

    useEffect(() => {
      onTrackingStatusChangeRef.current = onTrackingStatusChange;
    }, [onTrackingStatusChange]);

    const notifyDrawingChange = useCallback((hasDrawing: boolean) => {
      if (hasDrawingRef.current === hasDrawing) return;

      hasDrawingRef.current = hasDrawing;
      onDrawingChangeRef.current?.(hasDrawing);
    }, []);

    const emitStatus = useCallback((status: TrackingStatus, message: string) => {
      onTrackingStatusChangeRef.current?.(status, message);
    }, []);

    const resizeCanvas = useCallback(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;

      if (!container || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const { width, height } = container.getBoundingClientRect();

      const pixelWidth = Math.max(1, Math.floor(width * dpr));
      const pixelHeight = Math.max(1, Math.floor(height * dpr));

      if (canvas.width === pixelWidth && canvas.height === pixelHeight) {
        ctxRef.current = ctx;
        return;
      }

      const snapshot = hasDrawingRef.current
        ? canvas.toDataURL("image/png")
        : null;

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxRef.current = ctx;

      if (snapshot) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = snapshot;
      }
    }, []);

    useEffect(() => {
      resizeCanvas();

      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(container);

      return () => observer.disconnect();
    }, [resizeCanvas]);

    const clearCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;

      if (!canvas || !ctx) return;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      previousPointRef.current = null;
      lastMidPointRef.current = null;
      lostFrameCountRef.current = 0;

      notifyDrawingChange(false);
    }, [notifyDrawingChange]);

    const getDataUrl = useCallback(() => {
      const canvas = canvasRef.current;

      if (!canvas || !hasDrawingRef.current) return null;

      return canvas.toDataURL("image/png");
    }, []);

    const hasDrawing = useCallback(() => hasDrawingRef.current, []);

    useImperativeHandle(
      ref,
      () => ({
        clearCanvas,
        getDataUrl,
        hasDrawing,
        clear: clearCanvas,
        exportPng: getDataUrl,
      }),
      [clearCanvas, getDataUrl, hasDrawing],
    );

    const landmarkToPoint = useCallback(
      (landmark: { x: number; y: number }) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const { width, height } = canvas.getBoundingClientRect();

        let x = landmark.x * width;
        const y = landmark.y * height;

        if (mirrorX) {
          x = width - x;
        }

        return { x, y };
      },
      [mirrorX],
    );

    const drawSmoothCurve = useCallback(
      (from: Point, control: Point, to: Point, color: string) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        if (distance(from, to) < MIN_DRAW_DISTANCE) return;

        ctx.save();

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Soft contrast edge so the line stays visible on real backgrounds
        ctx.strokeStyle = color.includes("28, 28, 28")
          ? "rgba(255, 255, 255, 0.28)"
          : "rgba(28, 28, 28, 0.18)";
        ctx.globalAlpha = 0.34;
        ctx.lineWidth = 13;
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.stroke();

        // Main soft trace line
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.66;
        ctx.lineWidth = 8.5;
        ctx.shadowColor = color.includes("255, 250, 238")
          ? "rgba(0, 0, 0, 0.22)"
          : "rgba(255, 255, 255, 0.12)";
        ctx.shadowBlur = 2.5;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.stroke();

        // Soft inner highlight, smooth but still a little handmade
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 2.1;
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.moveTo(from.x - 1, from.y - 1);
        ctx.quadraticCurveTo(control.x - 1, control.y - 1, to.x - 1, to.y - 1);
        ctx.stroke();

        ctx.restore();

        notifyDrawingChange(true);
      },
      [notifyDrawingChange],
    );

    const processLandmarks = useCallback(
      (results: HandLandmarkerResult) => {
        const landmarks = results.landmarks?.[0];
        const tip = landmarks?.[INDEX_FINGER_TIP];

        if (!tip) {
          lostFrameCountRef.current += 1;

          if (lostFrameCountRef.current > LOST_FRAME_GRACE) {
            previousPointRef.current = null;
            lastMidPointRef.current = null;
            emitStatus("lost", "Hold your hand in view");
          }

          return;
        }

        lostFrameCountRef.current = 0;

        const raw = landmarkToPoint(tip);
        if (!raw) return;

        const previous = previousPointRef.current;

        if (!previous) {
          previousPointRef.current = raw;
          lastMidPointRef.current = null;
          emitStatus("detected", "Finger detected");
          return;
        }

        const smoothed: Point = {
          x: previous.x * 0.78 + raw.x * 0.22,
          y: previous.y * 0.78 + raw.y * 0.22,
        };

        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();

        const jumpLimit = rect
          ? Math.min(rect.width, rect.height) * MAX_JUMP_RATIO
          : 240;

        if (distance(previous, smoothed) > jumpLimit) {
          previousPointRef.current = raw;
          lastMidPointRef.current = null;
          emitStatus("detected", "Finger detected");
          return;
        }

        // Detect immediately, but only draw after Start tracing
        if (!tracingActive) {
          previousPointRef.current = raw;
          lastMidPointRef.current = null;
          emitStatus("detected", "Finger detected");
          return;
        }

        const mid = midpoint(previous, smoothed);
        const from = lastMidPointRef.current ?? previous;

        drawSmoothCurve(from, previous, mid, traceColor);

        lastMidPointRef.current = mid;
        previousPointRef.current = smoothed;

        emitStatus("detected", "Finger detected");
      },
      [drawSmoothCurve, emitStatus, landmarkToPoint, traceColor, tracingActive],
    );

    const stopLoop = useCallback(() => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      isDetectingRef.current = false;
      lastVideoTimeRef.current = -1;
    }, []);

    const detectFrame = useCallback(() => {
      if (!isDetectingRef.current) return;

      const landmarker = handLandmarkerRef.current;
      const video = videoRef.current;

      if (!landmarker || !video || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      const currentTime = video.currentTime;

      if (currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = currentTime;

        try {
          const results = landmarker.detectForVideo(video, performance.now());
          processLandmarks(results);
        } catch {
          previousPointRef.current = null;
          lastMidPointRef.current = null;
          emitStatus("lost", "Hold your hand in view");
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    }, [emitStatus, processLandmarks, videoRef]);

    const startLoop = useCallback(() => {
      if (animationFrameRef.current !== null) return;

      isDetectingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    }, [detectFrame]);

    const initMediaPipe = useCallback(async () => {
      if (handLandmarkerRef.current) {
        emitStatus("ready", "Move your index finger through the air.");
        startLoop();
        return;
      }

      if (initStartedRef.current) return;

      initStartedRef.current = true;
      emitStatus("loading", "Starting air tracing…");

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

        const options = {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU" as const,
          },
          runningMode: "VIDEO" as const,
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        };

        try {
          handLandmarkerRef.current =
            await HandLandmarker.createFromOptions(vision, options);
        } catch {
          handLandmarkerRef.current = await HandLandmarker.createFromOptions(
            vision,
            {
              ...options,
              baseOptions: {
                ...options.baseOptions,
                delegate: "CPU",
              },
            },
          );
        }

        emitStatus("ready", "Move your index finger through the air.");
        startLoop();
      } catch {
        emitStatus("unavailable", "Air tracing is having trouble starting.");
      }
    }, [emitStatus, startLoop]);

    useEffect(() => {
      const shouldDetect = detectionActive || tracingActive;

      if (shouldDetect) {
        isDetectingRef.current = true;
        resizeCanvas();
        void initMediaPipe();
      } else {
        stopLoop();

        previousPointRef.current = null;
        lastMidPointRef.current = null;

        if (!handLandmarkerRef.current && !initStartedRef.current) {
          emitStatus("idle", "");
        }
      }

      return () => {
        stopLoop();
      };
    }, [
      detectionActive,
      tracingActive,
      initMediaPipe,
      stopLoop,
      emitStatus,
      resizeCanvas,
    ]);

    useEffect(() => {
      return () => {
        stopLoop();

        handLandmarkerRef.current?.close();
        handLandmarkerRef.current = null;
      };
    }, [stopLoop]);

    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          aria-hidden
        />
      </div>
    );
  },
);