"use client";

import { useEffect, useRef } from "react";

// First-run explainer. The whole point is that someone arriving cold from
// Reddit understands the game in five seconds.
export default function HowToPlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-[var(--shadow-soft)] ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="howto-title"
          className="font-display text-2xl font-bold tracking-tight"
        >
          How to play <span className="text-clue">ZoomOut</span>
        </h2>
        <p className="mt-1 text-sm text-muted">
          One satellite puzzle a day — same place for everyone.
        </p>

        <ol className="mt-5 space-y-4">
          <Step n={1} accent="clue">
            You get a satellite view of a mystery spot. The{" "}
            <span className="font-semibold text-clue">crosshair</span> marks the
            exact place you&apos;re locating.
          </Step>
          <Step n={2} accent="answer">
            Drop a pin on the world map where you think it is, then hit{" "}
            <span className="font-semibold text-answer">Guess</span>.
          </Step>
          <Step n={3} accent="muted">
            Wrong? You get the distance and direction to the answer. Stuck? Hit{" "}
            <span className="font-semibold">Reveal more</span> to zoom out — but
            it costs points. <span className="font-semibold">Fewer zoom-outs and
            guesses = higher score.</span>
          </Step>
        </ol>

        <button
          ref={closeRef}
          onClick={onClose}
          className="mt-6 w-full cursor-pointer rounded-xl bg-answer px-4 py-3 font-display text-base font-semibold text-answer-on transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-answer"
        >
          Got it — let&apos;s play
        </button>
      </div>
    </div>
  );
}

function Step({
  n,
  accent,
  children,
}: {
  n: number;
  accent: "clue" | "answer" | "muted";
  children: React.ReactNode;
}) {
  const ring =
    accent === "clue"
      ? "bg-clue/15 text-clue"
      : accent === "answer"
        ? "bg-answer/15 text-answer"
        : "bg-surface-2 text-muted";
  return (
    <li className="flex gap-3">
      <span
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${ring}`}
      >
        {n}
      </span>
      <p className="pt-0.5 text-sm leading-relaxed">{children}</p>
    </li>
  );
}
