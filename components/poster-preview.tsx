"use client";

import { useMemo, useRef } from "react";

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
  image: HTMLImageElement,
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

export function PosterPreview({
  mood,
  capturedImageDataUrl,
  drawingDataUrl,
  onBack,
}: PosterPreviewProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const moodIcon = moodIconMap[mood.id];

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

  const handleSavePoster = async () => {
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
  
    // 2. Draw hand trace above captured image
    if (drawingDataUrl) {
      const drawingImage = await loadImage(drawingDataUrl);
      drawImageContain(ctx, drawingImage, imageX, imageY, imageWidth, imageHeight);
    }
  
    // 3. Draw top white mood icon banner
    const moodImage = await loadImage(moodIcon);
  
    const bannerWidth = 230;
    const bannerHeight = 82;
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
      bannerY + (bannerHeight - moodIconSize) / 2,
      moodIconSize,
      moodIconSize,
    );
    ctx.restore();
  
    // Footer strip
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, footerY, posterWidth, footerHeight + border);

    // subtle divider between image and footer
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

    ctx.fillText(
      nowText.toUpperCase(),
      posterWidth - border - 22,
      footerCenterY,
    );

    // 7. Download
    const dataUrl = canvas.toDataURL("image/png");
  
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
          className="overflow-hidden rounded-[1.8rem] border border-[var(--puff-ink)]/8 bg-white shadow-[0_20px_48px_-24px_rgba(61,58,56,0.2)]"
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

            <div className="absolute inset-0 z-20 flex justify-center p-4">
              <div className="flex h-[54px] w-[132px] items-center justify-center rounded-full bg-white/92 backdrop-blur-[3px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={moodIcon}
                  alt=""
                  className="h-[42px] w-[42px] object-contain"
                />
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSavePoster}
            className="flex-1 rounded-full border border-[var(--puff-paper)]/10 bg-[var(--puff-blue)] px-5 py-3 font-crayon text-sm tracking-[0.12em] text-white transition hover:opacity-90 active:scale-[0.98]"
          >
            Save poster
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-full border border-[var(--puff-ink)]/12 bg-white/70 px-5 py-3 text-sm tracking-[0.12em] font-crayon transition hover:bg-white active:scale-[0.98]"
          >
            Start over
          </button>
        </div>
      </main>
    </div>
  );
}