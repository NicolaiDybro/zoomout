"use client";

import { useEffect, useState } from "react";
import MapPicker from "@/components/MapPicker";
import {
  getDailyPuzzle,
  MAX_GUESSES,
  msUntilNextUtcMidnight,
  WIN_RADIUS_KM,
  type DailyPuzzle,
} from "@/lib/puzzle";
import { loadGame, saveGame } from "@/lib/storage";
import HowToPlay from "@/components/HowToPlay";
import {
  bearingDeg,
  compass,
  haversineKm,
  potentialScore,
  proximity,
  REVEAL_COST,
  scoreLoss,
  scoreWin,
  shareResult,
} from "@/lib/geo";

type Status = "playing" | "won" | "lost";
type Guess = { lat: number; lng: number; distanceKm: number; bearing: number };

export default function Game() {
  const [day, setDay] = useState<DailyPuzzle | null>(null);
  const [frameIndex, setFrameIndex] = useState(0); // advanced only by Reveal more
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [score, setScore] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [showIntro, setShowIntro] = useState(false);

  // resolve the daily puzzle + restore any saved game (client-only, UTC-based)
  useEffect(() => {
    const d = getDailyPuzzle();
    const saved = loadGame(d.dateKey);
    setDay(d);
    if (saved) {
      setGuesses(saved.guesses);
      setFrameIndex(saved.frameIndex);
      setStatus(saved.status);
      setScore(saved.score);
    }
    // first-time players get the explainer automatically
    try {
      if (!window.localStorage.getItem("zoomout:seen-intro")) setShowIntro(true);
    } catch {
      /* storage blocked; skip */
    }
  }, []);

  function closeIntro() {
    setShowIntro(false);
    try {
      window.localStorage.setItem("zoomout:seen-intro", "1");
    } catch {
      /* ignore */
    }
  }

  const puzzle = day?.puzzle;
  const maxReveals = puzzle ? puzzle.frames.length - 1 : 0;
  const revealsUsed = frameIndex;
  const guessesUsed = guesses.length;
  const guessesLeft = MAX_GUESSES - guessesUsed;
  const last = guesses[guesses.length - 1];
  const over = status !== "playing";
  const potential = potentialScore(guessesUsed, revealsUsed);

  // persist after every meaningful change
  useEffect(() => {
    if (!day) return;
    saveGame(day.dateKey, { guesses, frameIndex, status, score });
  }, [day, guesses, frameIndex, status, score]);

  // tick a countdown to the next puzzle once the game is over
  useEffect(() => {
    if (!over) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [over]);

  function revealMore() {
    if (status !== "playing" || frameIndex >= maxReveals) return;
    setFrameIndex((i) => i + 1);
  }

  function submitGuess() {
    if (!pin || !puzzle || status !== "playing") return;
    const distanceKm = haversineKm(pin.lat, pin.lng, puzzle.lat, puzzle.lon);
    const bearing = bearingDeg(pin.lat, pin.lng, puzzle.lat, puzzle.lon);
    const next = [...guesses, { ...pin, distanceKm, bearing }];
    setGuesses(next);
    setPin(null);

    if (distanceKm <= WIN_RADIUS_KM) {
      setScore(scoreWin(next.length, revealsUsed, distanceKm, WIN_RADIUS_KM));
      setStatus("won");
    } else if (next.length >= MAX_GUESSES) {
      const best = Math.min(...next.map((g) => g.distanceKm));
      setScore(scoreLoss(best));
      setStatus("lost");
    }
    // wrong but guesses left: only feedback, the clue does NOT change
  }

  async function share() {
    if (!day) return;
    const grid = shareResult(status === "won", revealsUsed, maxReveals);
    const text = `ZoomOut #${day.number}\n${grid}  ${score.toLocaleString()} pts\nzoomout.game`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; ignore */
    }
  }

  if (!day || !puzzle) {
    return (
      <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-10 md:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-surface-2" />
        <div className="h-80 rounded-2xl bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10">
      <HowToPlay open={showIntro} onClose={closeIntro} />

      <div className="mb-3 flex items-center justify-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Daily puzzle #{day.number}
        </span>
        <button
          onClick={() => setShowIntro(true)}
          className="cursor-pointer rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-answer"
          aria-label="How to play"
        >
          How to play
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ---- THE CLUE ------------------------------------------------ */}
        <section className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-soft)] ring-1 ring-border">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-clue">
              The clue
            </span>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular-nums text-muted">
              Zoom {frameIndex + 1} / {puzzle.frames.length}
            </span>
          </div>

          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-2">
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={frameIndex}
                src={puzzle.frames[frameIndex]}
                alt="A patch of the Earth seen from above. Guess where it is."
                className="h-full w-full animate-[fade_300ms_ease-out] object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-muted">
                No frame at{" "}
                <code className="mx-1 rounded bg-background px-1">
                  {puzzle.frames[frameIndex]}
                </code>
                . Run{" "}
                <code className="mx-1 rounded bg-background px-1">
                  python scripts/fetch_all.py
                </code>
                .
              </div>
            )}
            {!imgError && <Crosshair />}
          </div>

          <p className="mt-2 px-1 text-xs text-muted">
            {over
              ? `It was ${puzzle.name}.`
              : "The crosshair marks the exact spot you're locating."}
          </p>

          {!over && (
            <button
              onClick={revealMore}
              disabled={frameIndex >= maxReveals}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-clue/40 bg-clue/10 px-4 py-2.5 font-display text-sm font-semibold text-clue transition hover:bg-clue/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clue disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomOutIcon />
              {frameIndex >= maxReveals
                ? "Fully zoomed out"
                : `Reveal more  ·  −${REVEAL_COST} pts`}
            </button>
          )}
        </section>

        {/* ---- YOUR ANSWER -------------------------------------------- */}
        <section className="flex flex-col rounded-2xl bg-surface p-3 shadow-[var(--shadow-soft)] ring-1 ring-border">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-answer">
              Your answer
            </span>
            <span className="text-xs font-medium text-muted">
              {over
                ? "Final location revealed"
                : `${guessesLeft} guess${guessesLeft === 1 ? "" : "es"} left`}
            </span>
          </div>

          <MapPicker
            disabled={over}
            answer={over ? { lat: puzzle.lat, lon: puzzle.lon } : undefined}
            onPick={setPin}
          />

          {guesses.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {guesses.map((g, i) => {
                const solved = status === "won" && i === guesses.length - 1;
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm"
                  >
                    <span className="w-5 text-center font-bold tabular-nums text-muted">
                      {i + 1}
                    </span>
                    {solved ? (
                      <span className="font-semibold text-success">
                        Solved — spot on!
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold tabular-nums">
                          {Math.round(g.distanceKm).toLocaleString()} km
                        </span>
                        <span
                          className="text-answer"
                          style={{ transform: `rotate(${g.bearing}deg)` }}
                          aria-hidden
                        >
                          <ArrowUp />
                        </span>
                        <span className="text-xs font-medium text-muted">
                          {compass(g.bearing)}
                        </span>
                        <span className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-border">
                          <span
                            className="block h-full rounded-full bg-answer"
                            style={{
                              width: `${proximity(g.distanceKm) * 100}%`,
                            }}
                          />
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!over ? (
            <>
              <button
                onClick={submitGuess}
                disabled={!pin}
                className="mt-3 cursor-pointer rounded-xl bg-answer px-4 py-3 font-display text-base font-semibold text-answer-on shadow-[var(--shadow-soft)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-answer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pin ? "Guess" : "Click the map to place your pin"}
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                Solve now for up to{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {potential.toLocaleString()}
                </span>{" "}
                pts
              </p>
            </>
          ) : (
            <div className="mt-3 rounded-xl bg-surface-2 p-4 text-center">
              <p
                className={`font-display text-xl font-bold ${
                  status === "won" ? "text-success" : "text-danger"
                }`}
              >
                {status === "won" ? "Solved!" : "Out of guesses"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {puzzle.name} ·{" "}
                {Math.round(last?.distanceKm ?? 0).toLocaleString()} km from your
                last pin
              </p>
              <p className="mt-3 font-display text-3xl font-bold tabular-nums text-clue">
                {score.toLocaleString()}
                <span className="ml-1 text-base font-semibold text-muted">
                  pts
                </span>
              </p>
              <p className="mt-2 text-lg tracking-widest" aria-hidden>
                {shareResult(status === "won", revealsUsed, maxReveals)}
              </p>
              <button
                onClick={share}
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 font-display font-semibold text-background transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-answer"
              >
                {copied ? "Copied!" : "Share result"}
              </button>
              <p className="mt-3 text-xs text-muted">
                Next puzzle in{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatCountdown(msUntilNextUtcMidnight(new Date(now)))}
                </span>
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Marks the exact target point at the dead centre of every clue frame, so the
// answer stays unambiguous as the image zooms out.
function Crosshair() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        className="text-clue"
        style={{ filter: "drop-shadow(0 0 1.5px rgba(0,0,0,0.9))" }}
      >
        <circle
          cx="28"
          cy="28"
          r="13"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="3 3.6"
        />
        <line x1="28" y1="4" x2="28" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="28" y1="41" x2="28" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="4" y1="28" x2="15" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="41" y1="28" x2="52" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="28" cy="28" r="1.8" fill="currentColor" />
      </svg>
    </div>
  );
}

function ArrowUp() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="6 11 12 5 18 11" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
