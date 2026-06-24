// Great-circle distance between two lon/lat points, in kilometres.
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Initial compass bearing FROM the guess TO the target, in degrees (0 = North,
// clockwise). Used to point an arrow at the answer after each guess.
export function bearingDeg(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const dLon = toRad(toLon - fromLon);
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// 8-point compass label for a bearing, e.g. 45 -> "NE".
export function compass(bearing: number): string {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(bearing / 45) % 8];
}

// "Warmth" 0..1 — how close a guess is, for a proximity bar. Half the Earth's
// circumference (~20000 km) maps to 0; same spot maps to 1.
export function proximity(distanceKm: number): number {
  return Math.max(0, 1 - distanceKm / 20000);
}

// How much each voluntary zoom-out costs, and each extra guess after the first.
export const REVEAL_COST = 700;
export const GUESS_COST = 250;
const WIN_BASE = 5000;
const CLOSENESS_BONUS = 500;

// Score on a solved puzzle. Rewards using few zoom-outs and few guesses, plus a
// small bonus for a tight final pin. Floor of 500 so a win always feels earned.
export function scoreWin(
  guessesUsed: number,
  revealsUsed: number,
  finalDistanceKm: number,
  winRadiusKm: number,
): number {
  const base = WIN_BASE - revealsUsed * REVEAL_COST - (guessesUsed - 1) * GUESS_COST;
  const closeness =
    (1 - Math.min(finalDistanceKm, winRadiusKm) / winRadiusKm) * CLOSENESS_BONUS;
  return Math.max(500, Math.round(base + closeness));
}

// Best possible score if the next guess solves it right now — shown live so the
// cost of revealing more is tangible before you commit.
export function potentialScore(
  guessesUsed: number,
  revealsUsed: number,
): number {
  return scoreWin(guessesUsed + 1, revealsUsed, 0, 1);
}

// Consolation score when guesses run out: based purely on the closest pin.
export function scoreLoss(bestDistanceKm: number): number {
  return Math.round(proximity(bestDistanceKm) * 800);
}

// Spoiler-free share line. Result square + a "help bar" of how many zoom-outs
// were needed (fewer 🟧 = more impressive), e.g. "🟩 🟧🟧⬛⬛".
export function shareResult(
  solved: boolean,
  revealsUsed: number,
  maxReveals: number,
): string {
  const result = solved ? "🟩" : "🟥";
  const bar =
    "🟧".repeat(revealsUsed) +
    "⬛".repeat(Math.max(0, maxReveals - revealsUsed));
  return `${result} ${bar}`;
}
