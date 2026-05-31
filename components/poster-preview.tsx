"use client";

import { useMemo, useRef, useState } from "react";

import type { Mood, MoodId } from "@/lib/moods";

type PosterPreviewProps = {
  mood: Mood;
  capturedImageDataUrl: string | null;
  drawingDataUrl: string;
  onBack: () => void;
};

const moodIconMap: Record<MoodId, string> = {
  calm: "/doodles/calm.png",
  neutral: "/doodles/neutral.png",
  overwhelmed: "/doodles/overwhelmed.png",
  anxious: "/doodles/anxious.png",
  good: "/doodles/good.png",
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (!src.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;

  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > boxRatio) {
    sourceWidth = image.height * boxRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / boxRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.width / image.height;
  const boxRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > boxRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }

  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.closePath();
}

function drawWrappedCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.toUpperCase().split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);

  lines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight);
  });
}

function createEnhancedDrawingImage(
  drawingImage: HTMLImageElement,
  width: number,
  height: number,
) {
  const enhancedCanvas = document.createElement("canvas");
  enhancedCanvas.width = width;
  enhancedCanvas.height = height;

  const enhancedCtx = enhancedCanvas.getContext("2d");
  if (!enhancedCtx) return drawingImage;

  // Soft fill layer to close tiny gaps
  enhancedCtx.globalAlpha = 0.28;
  enhancedCtx.filter = "blur(1.2px)";
  enhancedCtx.drawImage(drawingImage, 0, 0, width, height);

  // Main crisp drawing layer
  enhancedCtx.globalAlpha = 1;
  enhancedCtx.filter = "none";
  enhancedCtx.drawImage(drawingImage, 0, 0, width, height);

  // Slight second pass to make it feel fuller
  enhancedCtx.globalAlpha = 0.32;
  enhancedCtx.drawImage(drawingImage, 0.6, 0.6, width, height);

  enhancedCtx.globalAlpha = 1;

  return enhancedCanvas;
}

export function PosterPreview({
  mood,
  capturedImageDataUrl,
  drawingDataUrl,
  onBack,
}: PosterPreviewProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const moodIcon = moodIconMap[mood.id];

  const [caption, setCaption] = useState("");
  const [showCaptionInput, setShowCaptionInput] = useState(false);

  const captionLimit = 42;
  const cleanCaption = caption.trim();

  const nowText = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date()),
    [],
  );

  const handleSharePoster = async () => {
    const canvas = document.createElement("canvas");

    const posterWidth = 1080;

    const border = 36;
    const imageWidth = posterWidth - border * 2;
    const imageHeight = 1240;

    const footerHeight = 170;
    const posterHeight = imageHeight + footerHeight + border * 2;

    const imageX = border;
    const imageY = border;
    const footerY = imageY + imageHeight;

    canvas.width = posterWidth;
    canvas.height = posterHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Polaroid white base
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, posterWidth, posterHeight);

    // Captured image inside white border
    if (capturedImageDataUrl) {
      const capturedImage = await loadImage(capturedImageDataUrl);
      drawImageCover(ctx, capturedImage, imageX, imageY, imageWidth, imageHeight);
    } else {
      ctx.fillStyle = "#F8F6F1";
      ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
    }

    // Draw hand trace above captured image
    if (drawingDataUrl) {
      const drawingImage = await loadImage(drawingDataUrl);
    
      const enhancedDrawing = createEnhancedDrawingImage(
        drawingImage,
        imageWidth,
        imageHeight,
      );
    
      drawImageContain(ctx, enhancedDrawing, imageX, imageY, imageWidth, imageHeight);
    }

    // Mood icon banner with optional caption
    const moodImage = await loadImage(moodIcon);

    const bannerWidth = cleanCaption ? 390 : 230;
    const bannerHeight = cleanCaption ? 150 : 82;
    const bannerX = (posterWidth - bannerWidth) / 2;
    const bannerY = imageY + 28;

    ctx.save();
    drawRoundedRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight, 48);
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.fill();

    const moodIconSize = 58;

    ctx.drawImage(
      moodImage,
      bannerX + (bannerWidth - moodIconSize) / 2,
      bannerY + (cleanCaption ? 22 : (bannerHeight - moodIconSize) / 2),
      moodIconSize,
      moodIconSize,
    );

    if (cleanCaption) {
      ctx.fillStyle = "rgba(28, 28, 28, 0.72)";
      ctx.font = "24px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      drawWrappedCenteredText(
        ctx,
        cleanCaption,
        posterWidth / 2,
        bannerY + 106,
        bannerWidth - 56,
        30,
      );
    }

    ctx.restore();

    // Footer strip
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, footerY, posterWidth, footerHeight + border);

    // Subtle divider between image and footer
    ctx.strokeStyle = "rgba(28, 28, 28, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(border, footerY);
    ctx.lineTo(posterWidth - border, footerY);
    ctx.stroke();

    // Footer alignment
    const footerCenterY = footerY + footerHeight / 2;

    // Logo on footer left
    const logoImage = await loadImage("/doodles/logo.png");
    const logoSize = 96;

    ctx.drawImage(
      logoImage,
      border + 22,
      footerCenterY - logoSize / 2,
      logoSize,
      logoSize,
    );

    // Date on footer right
    ctx.fillStyle = "rgba(28, 28, 28, 0.68)";
    ctx.font = "22px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    ctx.fillText(nowText.toUpperCase(), posterWidth - border - 22, footerCenterY);

    // Share on mobile, download fallback on desktop or unsupported browsers
    const dataUrl = canvas.toDataURL("image/png");
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const file = new File([blob], `puff-note-${mood.id}.png`, {
      type: "image/png",
    });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "Puff Note",
          text: "A little Puff Note moment ☁️",
          files: [file],
        });
        return;
      } catch {
        // If user cancels the share sheet, fall back to download.
      }
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `puff-note-${mood.id}.png`;
    link.click();
  };

  return (
    <div className="relative min-h-full flex-1 overflow-hidden">
      <div
        className="puff-cloud-bg pointer-events-none absolute inset-0"
        aria-hidden
      />

      <main className="relative mx-auto flex w-full max-w-lg flex-col gap-8 px-5 pb-12 pt-10 sm:max-w-xl sm:px-8 sm:pt-14">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-crayon tracking-[0.28em] text-[var(--puff-muted)]">
              POSTER PREVIEW
            </p>
            <h1 className="font-crayon text-2xl text-[var(--puff-ink)] sm:text-3xl">
              Preview
            </h1>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-full border border-[var(--puff-ink)]/12 bg-white/60 px-4 py-1.5 text-sm tracking-wide font-crayon backdrop-blur-sm transition hover:bg-white active:scale-95"
          >
            Start over
          </button>
        </header>

        <article
          ref={posterRef}
          className="overflow-hidden rounded-[1.8rem] border border-[var(--puff-ink)]/8 bg-white"
        >
          <div className="relative aspect-[4/5] w-full">
            {capturedImageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturedImageDataUrl}
                alt="Captured camera frame"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className="puff-sky-placeholder absolute inset-0"
                data-mood={mood.id}
                aria-hidden
              />
            )}

            {drawingDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={drawingDataUrl}
                alt="Your trace overlay"
                className="absolute inset-0 z-10 h-full w-full object-contain"
              />
            ) : null}

            <div className="absolute inset-x-0 top-4 z-20 flex justify-center px-4">
              <div
                className={[
                  "flex items-center justify-center rounded-[999px] bg-white/92 px-5 backdrop-blur-[3px]",
                  cleanCaption
                    ? "min-h-[78px] w-[220px] flex-col py-3"
                    : "h-[54px] w-[132px]",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={moodIcon}
                  alt=""
                  className="h-[42px] w-[42px] object-contain"
                />

                {cleanCaption ? (
                  <p className="mt-1 max-w-[180px] truncate text-center font-mono text-[0.52rem] uppercase tracking-[0.16em] text-[#1C1C1C]/70">
                    {cleanCaption}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--puff-ink)]/6 bg-white px-4 py-1.5">
            <div className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/doodles/logo.png"
                alt="Puff Note"
                className="h-20 w-20 object-contain"
              />
            </div>

            <p className="max-w-[12rem] text-right font-mono text-[0.58rem] uppercase leading-relaxed tracking-[0.2em] text-[var(--puff-ink)]/70">
              {nowText}
            </p>
          </div>
        </article>

        <button
          type="button"
          onClick={() => setShowCaptionInput(true)}
          className="rounded-full border border-[var(--puff-ink)]/10 bg-white px-5 py-3 font-crayon text-sm tracking-[0.12em] text-[var(--puff-ink)] transition active:scale-[0.98]"
        >
          {cleanCaption ? "Edit caption" : "Add caption"}
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSharePoster}
            className="flex-1 rounded-full border border-[var(--puff-paper)]/10 bg-[var(--puff-blue)] px-5 py-3 font-crayon text-sm tracking-[0.12em] text-white transition hover:opacity-90 active:scale-[0.98]"
            aria-label="Share poster"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 16V4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M7.5 8.5L12 4L16.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 14V18.5C5 19.3 5.7 20 6.5 20H17.5C18.3 20 19 19.3 19 18.5V14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Share
            </span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-full border border-[var(--puff-ink)]/12 bg-white/70 px-5 py-3 text-sm tracking-[0.12em] font-crayon transition hover:bg-white active:scale-[0.98]"
          >
            Start over
          </button>
        </div>

        {showCaptionInput ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F8F6F1]/50 px-5 backdrop-blur-[6px]">
            <div className="flex max-w-md flex-col rounded-[2rem] border border-[var(--puff-ink)]/8 bg-white px-5 py-5 shadow-[0_24px_70px_rgba(28,28,28,0.12)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--puff-ink)]/45">
                    Caption
                  </p>
                  <h2 className="mt-1 font-crayon text-xl text-[var(--puff-ink)]">
                    Add a small note
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCaptionInput(false)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-[var(--puff-ink)]/10 bg-[#F8F6F1] font-mono text-sm text-[var(--puff-ink)] transition active:scale-95"
                  aria-label="Close caption editor"
                >
                  ×
                </button>
              </div>

              <textarea
                value={caption}
                onChange={(event) =>
                  setCaption(event.target.value.slice(0, captionLimit))
                }
                autoFocus
                placeholder="Whats in your mind..."
                className="min-h-0 flex-1 resize-none rounded-[1.5rem] border border-[var(--puff-ink)]/10 bg-[#F8F6F1] px-5 py-5 font-crayon text-2xl leading-relaxed text-[var(--puff-ink)] outline-none placeholder:text-[var(--puff-ink)]/28"
              />

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setCaption("");
                    setShowCaptionInput(false);
                  }}
                  className="rounded-full border border-[var(--puff-ink)]/10 bg-white px-5 py-3 font-crayon text-sm tracking-[0.12em] text-[var(--puff-ink)]/55 transition active:scale-[0.98]"
                >
                  Clear
                </button>

                <p className="font-mono text-[0.65rem] text-[var(--puff-ink)]/45">
                  {caption.length}/{captionLimit}
                </p>

                <button
                  type="button"
                  onClick={() => setShowCaptionInput(false)}
                  className="grid h-12 w-12 place-items-center rounded-full bg-[var(--puff-blue)] text-white transition active:scale-95"
                  aria-label="Confirm caption"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                    <path
                      d="M5 12.5L10 17L19 7"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : null}

      </main>
    </div>
  );
}