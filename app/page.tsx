import Game from "@/components/Game";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto w-full max-w-5xl px-4 pt-8 pb-4 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Zoom<span className="text-clue">Out</span>
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Where on Earth is this? Read the satellite clue and drop a pin. Reveal
          more only if you need it — the fewer zoom-outs, the higher your score.
        </p>
      </header>

      <Game />

      <footer className="mx-auto mt-auto w-full max-w-5xl px-4 py-6 text-center text-xs text-muted/80">
        Imagery: Sentinel-2 cloudless (s2maps.eu) by EOX IT Services GmbH · Map ©
        OpenStreetMap contributors
      </footer>
    </main>
  );
}
