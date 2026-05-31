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
  tracingActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mirrorX?: boolean;
  onDrawingChange?: (hasDrawing: boolean) => void;
  onTrackingStatusChange?: (status: TrackingStatus, message: string) => void;
};

type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

const WARM_WHITE_TRACE = "rgba(255, 250, 238, 0.96)";
const SOFT_CHARCOAL_TRACE = "rgba(28, 28, 28, 0.76)";
const SOFT_BLUE_TRACE = "rgba(95, 136, 201, 0.9)";
const SOFT_LILAC_TRACE = "rgba(210, 198, 232, 0.9)";
const MIN_DRAW_DISTANCE = 2.8;

function getLuminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}


export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas(
    {
      className = "",
      tracingActive,
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
    const lostFrameCountRef = useRef(0);
    const isTracingRef = useRef(false);
    const hasDrawingRef = useRef(false);
    const lastVideoTimeRef = useRef(-1);
    const initStartedRef = useRef(false);
    
    const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const sampleFrameCountRef = useRef(0);
    const currentTraceColorRef = useRef(WARM_WHITE_TRACE);

    const onDrawingChangeRef = useRef(onDrawingChange);

    useEffect(() => {
      onDrawingChangeRef.current = onDrawingChange;
    }, [onDrawingChange]);
    
    const notifyDrawingChange = useCallback((hasDrawing: boolean) => {
      if (hasDrawingRef.current === hasDrawing) return;
      hasDrawingRef.current = hasDrawing;
      onDrawingChangeRef.current?.(hasDrawing);
    }, []);

    const onTrackingStatusChangeRef = useRef(onTrackingStatusChange);

    useEffect(() => {
      onTrackingStatusChangeRef.current = onTrackingStatusChange;
    }, [onTrackingStatusChange]);
    
    const emitStatus = useCallback((status: TrackingStatus, message: string) => {
      onTrackingStatusChangeRef.current?.(status, message);
    }, []);

    const applyStrokeStyle = useCallback((ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 5.5;
      ctx.strokeStyle = currentTraceColorRef.current;
      ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
      ctx.shadowBlur = 4;
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
        applyStrokeStyle(ctx);
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
      applyStrokeStyle(ctx);
      ctxRef.current = ctx;

      if (snapshot) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = snapshot;
      }
    }, [applyStrokeStyle]);

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
      lostFrameCountRef.current = 0;
      currentTraceColorRef.current = WARM_WHITE_TRACE;
    
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

    const sampleTraceColor = useCallback(
      (landmark: { x: number; y: number }) => {
        sampleFrameCountRef.current += 1;
    
        if (sampleFrameCountRef.current % 8 !== 0) {
          return currentTraceColorRef.current;
        }
    
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
          return currentTraceColorRef.current;
        }
    
        let sampleCanvas = sampleCanvasRef.current;
        if (!sampleCanvas) {
          sampleCanvas = document.createElement("canvas");
          sampleCanvas.width = 5;
          sampleCanvas.height = 5;
          sampleCanvasRef.current = sampleCanvas;
        }
    
        const sampleCtx = sampleCanvas.getContext("2d", {
          willReadFrequently: true,
        });
    
        if (!sampleCtx) {
          return currentTraceColorRef.current;
        }
    
        const sourceX = Math.max(
          0,
          Math.min(video.videoWidth - 5, Math.floor(landmark.x * video.videoWidth) - 2),
        );
    
        const sourceY = Math.max(
          0,
          Math.min(video.videoHeight - 5, Math.floor(landmark.y * video.videoHeight) - 2),
        );
    
        try {
          sampleCtx.clearRect(0, 0, 5, 5);
          sampleCtx.drawImage(video, sourceX, sourceY, 5, 5, 0, 0, 5, 5);
    
          const pixels = sampleCtx.getImageData(0, 0, 5, 5).data;
    
          let r = 0;
          let g = 0;
          let b = 0;
          let count = 0;
    
          for (let i = 0; i < pixels.length; i += 4) {
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
            count += 1;
          }
    
          r = r / count;
          g = g / count;
          b = b / count;
    
          const luminance = getLuminance(r, g, b);
    
          let nextColor = SOFT_BLUE_TRACE;
    
          if (luminance < 95) {
            nextColor = WARM_WHITE_TRACE;
          } else if (luminance > 185) {
            nextColor = SOFT_CHARCOAL_TRACE;
          } else if (luminance > 135) {
            nextColor = SOFT_BLUE_TRACE;
          } else {
            nextColor = SOFT_LILAC_TRACE;
          }
    
          currentTraceColorRef.current = nextColor;
          return nextColor;
        } catch {
          return currentTraceColorRef.current;
        }
      },
      [videoRef],
    );

    const drawSegment = useCallback(
      (from: Point, to: Point, color: string) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
    
        if (distance(from, to) < MIN_DRAW_DISTANCE) return;
    
        ctx.save();
    
        // Soft outer edge for visibility on busy real life backgrounds
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = color.includes("28, 28, 28")
          ? "rgba(255, 255, 255, 0.42)"
          : "rgba(28, 28, 28, 0.28)";
        ctx.globalAlpha = 0.42;
        ctx.lineWidth = 8.5;
        ctx.shadowBlur = 0;
    
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    
        // Main smooth pastel stroke
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.92;
        ctx.lineWidth = 5.2;
        ctx.shadowColor = color.includes("255, 250, 238")
          ? "rgba(0, 0, 0, 0.28)"
          : "rgba(255, 255, 255, 0.18)";
        ctx.shadowBlur = 3;
    
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    
        // Subtle crayon highlight, no random dots
        ctx.strokeStyle = color.includes("28, 28, 28")
          ? "rgba(255, 255, 255, 0.18)"
          : "rgba(255, 255, 255, 0.32)";
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.4;
        ctx.shadowBlur = 0;
    
        ctx.beginPath();
        ctx.moveTo(from.x - 0.8, from.y - 0.8);
        ctx.lineTo(to.x - 0.8, to.y - 0.8);
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
          emitStatus("detected", "Finger detected");
          return;
        }
    
        const smoothed: Point = {
          x: previous.x * 0.55 + raw.x * 0.45,
          y: previous.y * 0.55 + raw.y * 0.45,
        };
    
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();
        const jumpLimit = rect
          ? Math.min(rect.width, rect.height) * MAX_JUMP_RATIO
          : 240;
    
        if (distance(previous, smoothed) > jumpLimit) {
          previousPointRef.current = raw;
          emitStatus("detected", "Finger detected");
          return;
        }
    
        const traceColor = sampleTraceColor(tip);
        drawSegment(previous, smoothed, traceColor);
    
        previousPointRef.current = smoothed;
        emitStatus("detected", "Finger detected");
      },
      [drawSegment, emitStatus, landmarkToPoint, sampleTraceColor],
    );

    const stopLoop = useCallback(() => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isTracingRef.current = false;
      lastVideoTimeRef.current = -1;
    }, []);

    const detectFrame = useCallback(() => {
      if (!isTracingRef.current) return;

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
          emitStatus("lost", "Hold your hand in view");
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    }, [emitStatus, processLandmarks, videoRef]);

    const startLoop = useCallback(() => {
      if (animationFrameRef.current !== null) return;
    
      isTracingRef.current = true;
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
              baseOptions: { ...options.baseOptions, delegate: "CPU" },
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
      if (tracingActive) {
        isTracingRef.current = true;
        resizeCanvas();
        void initMediaPipe();
      } else {
        stopLoop();
        previousPointRef.current = null;

        if (!handLandmarkerRef.current && !initStartedRef.current) {
          emitStatus("idle", "");
        }
      }

      return () => {
        stopLoop();
      };
    }, [
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
