"use client";

import Image from "next/image";
import type { Mood } from "@/lib/moods";

type MoodBubbleProps = {
  mood: Mood;
  selected: boolean;
  onSelect: () => void;
};

const moodIcons: Record<string, string> = {
  calm: "/doodles/calm.png",
  neutral: "/doodles/neutral.png",
  overwhelmed: "/doodles/overwhelmed.png",
  anxious: "/doodles/anxious.png",
  good: "/doodles/good.png",
};

export function MoodBubble({ mood, selected, onSelect }: MoodBubbleProps) {
  const icon = moodIcons[mood.id] ?? moodIcons.calm;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      data-selected={selected ? "true" : "false"}
      className={[
        "group relative flex min-h-[140px] min-w-[132px] flex-col items-center justify-center overflow-hidden rounded-[20px] border px-4 py-5 text-center transition",
        "bg-[#FFFFFF] shadow-[0_10px_24px_rgba(28,28,28,0.035)]",
        "cursor-pointer [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
        "active:scale-[0.98]",
        selected
          ? "border-[#5F88C9]/55 shadow-[0_14px_34px_rgba(95,136,201,0.14)]"
          : "border-[#1C1C1C]/[0.07] hover:border-[#5F88C9]/35",
      ].join(" ")}
      aria-label={`${mood.label}${selected ? ", selected" : ""}`}
    >
      <span
        className={[
          "absolute right-4 top-4 h-2.5 w-2.5 rounded-full transition",
          selected ? "bg-[#5F88C9]" : "bg-[#1C1C1C]/10",
        ].join(" ")}
        aria-hidden
      />

      <div className="mb-4 flex h-[78px] items-center justify-center bg-white">
        <Image
          src={icon}
          alt=""
          width={92}
          height={92}
          className="puff-doodle-image"
          priority={false}
        />
      </div>

      <span className="block font-mono text-[13px] tracking-[0.22em] text-[#1C1C1C]">
        {mood.label}
      </span>
    </button>
  );
}