"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import type { MoodId } from "@/lib/moods";

export type CameraFeedHandle = {
  captureFramePng: () => string | null;
  getVideoElement: () => HTMLVideoElement | null;
};

type CameraFeedProps = {
  moodId: MoodId;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
};

export const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(
  function CameraFeed({ moodId, videoRef: externalVideoRef }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const assignVideoRef = useCallback(
      (element: HTMLVideoElement | null) => {
        videoRef.current = element;
    
        if (externalVideoRef) {
          externalVideoRef.current = element;
        }
      },
      [externalVideoRef],
    );
    const streamRef = useRef<MediaStream | null>(null);
    const [useFallback, setUseFallback] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        getVideoElement: () => videoRef.current,
        captureFramePng: () => {
          if (useFallback || !isReady) return null;
          const video = videoRef.current;
          if (!video) return null;

          const width = video.videoWidth;
          const height = video.videoHeight;
          if (!width || !height) return null;

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;

          ctx.drawImage(video, 0, 0, width, height);
          return canvas.toDataURL("image/png");
        },
      }),
      [isReady, useFallback],
    );

    useEffect(() => {
      let cancelled = false;

      async function startCamera() {
        if (!navigator.mediaDevices?.getUserMedia) {
          setUseFallback(true);
          return;
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;
          const video = videoRef.current;
          if (!video) {
            stopStream();
            setUseFallback(true);
            return;
          }

          video.srcObject = stream;
          await video.play();
          setUseFallback(false);
          setIsReady(true);
        } catch {
          if (!cancelled) {
            stopStream();
            setUseFallback(true);
          }
        }
      }

      startCamera();

      return () => {
        cancelled = true;
        stopStream();
      };
    }, []);

    const showPlaceholder = useFallback || !isReady;

    return (
      <>
        {showPlaceholder ? (
          <div
            className="puff-sky-placeholder pointer-events-none absolute inset-0 z-0"
            data-mood={moodId}
            aria-hidden
          />
        ) : null}
        <video
          ref={assignVideoRef}
          className={[
            "absolute inset-0 z-0 h-full w-full object-cover",
            showPlaceholder ? "pointer-events-none opacity-0" : "opacity-100",
          ].join(" ")}
          playsInline
          muted
          autoPlay
          aria-hidden={showPlaceholder}
        />
      </>
    );
  },
);
