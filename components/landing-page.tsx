"use client";

import { MoodPicker } from "@/components/mood-picker";
import type { MoodId } from "@/lib/moods";

type LandingPageProps = {
  selectedMoodId: MoodId | null;
  onSelectMood: (id: MoodId) => void;
  onStartCapture: () => void;
};

function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#F8F6F1]">
      <div className="absolute left-1/2 top-0 h-full w-full max-w-md -translate-x-1/2 overflow-hidden">
        {/* Static doodles, no big cloud, no star trail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/doodles/puff-note-bg-decor-v2.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-fill"
        />

        {/* Animated main cloud */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/doodles/cloud.png"
          alt=""
          aria-hidden
          className="puff-cloud-enter absolute right-[-80px] top-[100px] w-[390px] drop-shadow-[0_0_0_white] filter"
        />

        {/* Animated dotted trail, appearing one dash at a time from right to left */}
        <svg
          className="puff-star-trail absolute left-[72px] top-[400px] h-[74px] w-[420px]"
          viewBox="0 0 420 74"
          fill="none"
          aria-hidden
        >
          {/* right to left dash sequence */}
          <path
            className="puff-dash puff-dash-1"
            d="M395 28 C 385 31, 376 33, 366 34"
            stroke="#5F88C9"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            className="puff-dash puff-dash-2"
            d="M343 38 C 332 42, 321 43, 310 41"
            stroke="#5F88C9"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            className="puff-dash puff-dash-3"
            d="M287 39 C 276 36, 266 36, 255 40"
            stroke="#5F88C9"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            className="puff-dash puff-dash-4"
            d="M232 45 C 219 50, 206 51, 193 49"
            stroke="#5F88C9"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            className="puff-dash puff-dash-5"
            d="M169 46 C 156 42, 144 39, 131 41"
            stroke="#5F88C9"
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            className="puff-dash puff-dash-6"
            d="M108 43 C 96 47, 84 50, 72 48"
            stroke="#5F88C9"
            strokeWidth="1.35"
            strokeLinecap="round"
          />

          {/* small loop appears near the middle after some dashes */}
          <circle
            className="puff-star-loop"
            cx="250"
            cy="38"
            r="11"
            stroke="#5F88C9"
            strokeWidth="1.15"
            strokeDasharray="5 8"
          />

          {/* small star appears last */}
          <path
            className="puff-star-icon"
            d="M39 32L41 38L48 39L43 43L45 50L39 46L33 50L35 43L30 39L37 38L39 32Z"
            stroke="#1C1C1C"
            strokeWidth="0.95"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function LandingPage({
  selectedMoodId,
  onSelectMood,
  onStartCapture,
}: LandingPageProps) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[#F8F6F1] text-[#1C1C1C]">
      <BackgroundDecor />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden px-0 ">

      <section className="relative px-8 pb-[1rem] pt-[9.3rem]">
          <h1 className="relative z-10 max-w-[370px] font-crayon text-[30px] leading-[1.08] tracking-[-0.045em] text-[#a7a7a7]">
            A soft space
            <br />
            for your mind
            <br />
            to{" "}
            <span className="text-[#3F78BF73]">breathe.</span>
          </h1>
      </section>

        <section className="relative z-10 px-8 pb-30 pt-58">
          <div className="-mx-1">
            <MoodPicker selectedId={selectedMoodId} onSelect={onSelectMood} />
          </div>

          <button
            type="button"
            disabled={!selectedMoodId}
            onClick={onStartCapture}
            className="mt-4 flex min-h-16 w-full items-center justify-center gap-4 rounded-full border border-[#3F76B5]/45 bg-[#3F76B5] px-6 py-4 text-center font-crayon text-[12px] font-medium uppercase tracking-[0.34em] text-white shadow-[0_18px_45px_rgba(63,120,191,0.16)] transition [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:border-[#1C1C1C]/10 disabled:bg-white/45 disabled:text-[#1C1C1C]/35 disabled:shadow-none"
          >
            <span className="text-lg leading-none">✎</span>
            <span>
              {selectedMoodId ? "Capture moment" : "Pick a Mood"}
            </span>
          </button>
          <footer className="pt-20 text-center">
            <p className="font-mono text-[11px] uppercase leading-[1.9] tracking-[0.34em] text-[#6f6f6f]/65">
            A 
            <br />
            A 217 Atelier
            <br />
            Project
            </p>
        </footer>
        </section>
      </main>
    </div>
  );
}