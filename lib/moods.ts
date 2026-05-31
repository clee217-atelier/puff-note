export type MoodId = "calm" | "neutral" | "overwhelmed" | "anxious" | "good";

export type Mood = {
  id: MoodId;
  label: string;
};

export const MOODS: Mood[] = [
  {
    id: "calm",
    label: "Calm"
  },
  {
    id: "neutral",
    label: "Neutral"
  },
  {
    id: "overwhelmed",
    label: "Overwhelmed"
  },
  {
    id: "anxious",
    label: "Anxious"
  },
  {
    id: "good",
    label: "Good"
  },
];

export function getMoodById(id: MoodId): Mood {
  return MOODS.find((mood) => mood.id === id) ?? MOODS[0];
}