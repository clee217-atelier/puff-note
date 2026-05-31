"use client";

import { useState } from "react";

import { CaptureScreen } from "@/components/capture-screen";
import { LandingPage } from "@/components/landing-page";
import { PosterPreview } from "@/components/poster-preview";
import { getMoodById } from "@/lib/get-mood";
import type { MoodId } from "@/lib/moods";

type Screen = "landing" | "capture" | "poster";

export function PuffNoteApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [selectedMoodId, setSelectedMoodId] = useState<MoodId | null>(null);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(
    null,
  );

  const selectedMood = selectedMoodId ? getMoodById(selectedMoodId) : null;

  const goToLanding = () => {
    setScreen("landing");
    setDrawingDataUrl(null);
    setCapturedImageDataUrl(null);
  };

  if (screen === "capture" && selectedMood) {
    return (
      <CaptureScreen
        mood={selectedMood}
        onBack={goToLanding}
        onCapture={({ capturedImageDataUrl, drawingDataUrl }) => {
          setCapturedImageDataUrl(capturedImageDataUrl);
          setDrawingDataUrl(drawingDataUrl);
          setScreen("poster");
        }}
      />
    );
  }

  if (screen === "poster" && selectedMood && drawingDataUrl) {
    return (
      <PosterPreview
        mood={selectedMood}
        capturedImageDataUrl={capturedImageDataUrl}
        drawingDataUrl={drawingDataUrl}
        onBack={goToLanding}
      />
    );
  }

  return (
    <LandingPage
      selectedMoodId={selectedMoodId}
      onSelectMood={setSelectedMoodId}
      onStartCapture={() => {
        if (!selectedMoodId) return;
        setScreen("capture");
      }}
    />
  );
}
