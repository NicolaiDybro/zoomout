"use client";

import { useEffect } from "react";

// Error boundary for the page subtree. Without this, any client-side error
// blanks the whole page. Here we show a friendly state, a retry, and the actual
// message so problems are diagnosable instead of a dead screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ZoomOut page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Zoom<span className="text-clue">Out</span>
      </h1>
      <p className="text-muted">Something went wrong loading today&apos;s puzzle.</p>
      <pre className="max-w-md overflow-x-auto rounded-lg bg-surface-2 px-4 py-3 text-left text-xs text-danger">
        {error?.message || "Unknown error"}
        {error?.digest ? `\n(digest: ${error.digest})` : ""}
      </pre>
      <button
        onClick={reset}
        className="cursor-pointer rounded-xl bg-answer px-5 py-2.5 font-display font-semibold text-answer-on transition hover:brightness-110"
      >
        Try again
      </button>
    </main>
  );
}
