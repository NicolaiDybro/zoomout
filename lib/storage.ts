// Per-day game persistence in localStorage, so a finished day can't be replayed
// and a refresh mid-game restores progress.

export type SavedGuess = {
  lat: number;
  lng: number;
  distanceKm: number;
  bearing: number;
};

export type SavedGame = {
  guesses: SavedGuess[];
  frameIndex: number;
  status: "playing" | "won" | "lost";
  score: number;
};

const PREFIX = "zoomout:";

export function loadGame(dateKey: string): SavedGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + dateKey);
    return raw ? (JSON.parse(raw) as SavedGame) : null;
  } catch {
    return null;
  }
}

export function saveGame(dateKey: string, game: SavedGame): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + dateKey, JSON.stringify(game));
  } catch {
    /* storage full or blocked; ignore */
  }
}
