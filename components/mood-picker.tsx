"use client";

import Image from "next/image";
import { MOODS, type MoodId } from "@/lib/moods";

type MoodPickerProps = {
  selectedId: MoodId | null;
  onSelect: (id: MoodId) => void;
};

const moodIcons: Record<MoodId, string> = {
  calm: "/doodles/calm.png",
  neutral: "/doodles/neutral.png",
  overwhelmed: "/doodles/overwhelmed.png",
  anxious: "/doodles/anxious.png",
  good: "/doodles/good.png",
};

export function MoodPicker({ selectedId, onSelect }: MoodPickerProps) {
  return (
    <section className="relative z-20 w-full" aria-label="Mood picker">
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar [touch-action:pan-x]">
        {MOODS.map((mood) => {
          const selected = selectedId === mood.id;

          return (
              <button
                key={mood.id}
                type="button"
                onClick={() => onSelect(mood.id)}
                aria-pressed={selected}
                className={[
                  "relative flex min-h-[148px] min-w-[132px] flex-col items-center justify-center rounded-[20px] border px-4 py-5 text-center transition",
                  "bg-white",
                  "active:scale-[0.98]",
                  selected
                    ? "border-[#5F88C9] bg-white"
                    : "border-[#1C1C1C]/[0.08] bg-white hover:border-[#5F88C9]/45",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute right-4 top-4 h-2.5 w-2.5 rounded-full transition",
                    selected ? "bg-[#5F88C9]" : "bg-[#1C1C1C]/10",
                  ].join(" ")}
                />

              <div className="mb-4 flex h-[68px] items-center justify-center">
                <Image
                  src={moodIcons[mood.id]}
                  alt=""
                  width={82}
                  height={82}
                  className="puff-doodle-image"
                  priority={false}
                />
              </div>

              <div className="font-mono text-[13px] tracking-[0.22em] text-[#1C1C1C]">
                {mood.label}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}