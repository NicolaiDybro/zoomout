import locations from "@/data/locations.json";

// A single puzzle = one location plus its pre-generated zoom frames.
export type Puzzle = {
  slug: string;
  name: string; // the answer, revealed only at the end
  lat: number;
  lon: number;
  frames: string[]; // frame1 (hardest, most zoomed in) -> frameN (easiest)
};

// Guess attempts allowed. Independent of zoom — a wrong guess gives distance +
// direction feedback but does NOT zoom the clue; zooming out is a voluntary
// "Reveal more" action that costs points.
export const MAX_GUESSES = 6;

// "Close enough to win" threshold, in kilometres.
export const WIN_RADIUS_KM = 50;

const MS_PER_DAY = 86_400_000;
// Launch epoch (UTC midnight) — the day that is puzzle #1.
const LAUNCH_DAY = Date.UTC(2026, 5, 24) / MS_PER_DAY; // 2026-06-24

function framesFor(slug: string): string[] {
  return [1, 2, 3, 4, 5].map((i) => `/frames/${slug}/frame${i}.jpg`);
}

// The puzzle pool. Shared with scripts/ via data/locations.json so the game and
// the tile generator never drift. Replaced by the curated location generator
// later; for now it's a hand-picked, globally spread set.
export const PUZZLES: Puzzle[] = (
  locations as { slug: string; name: string; lat: number; lon: number }[]
).map((l) => ({ ...l, frames: framesFor(l.slug) }));

function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      MS_PER_DAY,
  );
}

export type DailyPuzzle = { puzzle: Puzzle; number: number; dateKey: string };

// The puzzle for a given day — identical for everyone in the same UTC day.
export function getDailyPuzzle(date: Date = new Date()): DailyPuzzle {
  const day = utcDayNumber(date);
  const idx = ((day % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  return {
    puzzle: PUZZLES[idx],
    number: day - LAUNCH_DAY + 1,
    dateKey: date.toISOString().slice(0, 10), // UTC YYYY-MM-DD
  };
}

// Milliseconds until the next UTC midnight (when a new puzzle unlocks).
export function msUntilNextUtcMidnight(date: Date = new Date()): number {
  const next = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
  return next - date.getTime();
}
