import { MOODS, type Mood, type MoodId } from "@/lib/moods";

export function getMoodById(id: MoodId): Mood {
  const mood = MOODS.find((m) => m.id === id);
  if (!mood) {
    throw new Error(`Unknown mood: ${id}`);
  }
  return mood;
}
