# ZoomOut

A daily geo-guessing puzzle. You see a satellite frame of a mystery spot (a
crosshair marks the exact target); drop a pin on the world map to say where on
Earth it is. A wrong guess tells you the distance and direction to the answer.
Stuck? You can *Reveal more* to zoom the satellite out for context — but every
zoom-out costs points. The fewer zoom-outs and guesses, the higher your score.

One puzzle per day, the same for everyone, rotating through a global pool.

## Run it

```bash
# 1. generate the satellite frames for the puzzle pool
pip install -r scripts/requirements.txt
python scripts/fetch_all.py              # all locations in data/locations.json

# 2. run the game
npm run dev                              # http://localhost:3000
```

If you skip step 1 the game still runs — it just shows a "no frame image" note
where the satellite picture would be. To generate a single location:

```bash
python scripts/fetch_tiles.py 35.36 138.73 fuji     # lat lon slug
```

## Regenerate the puzzle pool

`data/locations.json` is generated, not hand-written. It picks cities as anchor
points (recognisable, nameable, on land) and balances them across the globe via
a lat/lon grid so no region dominates:

```bash
python scripts/generate_locations.py 60            # 60 cities, pop >= 100k
python scripts/generate_locations.py 120 --min-pop 250000 --seed 7
python scripts/fetch_all.py                        # then fetch their frames
```

The seed makes it reproducible. Bump `--min-pop` for more famous (easier)
cities, lower it for obscure (harder) ones.

## How it's wired

- `data/locations.json` — the generated puzzle pool (slug + name + lat/lon).
  Shared by the game and the tile scripts so they never drift.
- `scripts/generate_locations.py` — builds the balanced pool from offline city
  data (`geonamescache`); no API, no downloads.
- `scripts/fetch_tiles.py` — pulls EOX s2cloudless (Sentinel-2) tiles, stitches
  and centre-crops one square JPG per zoom level into `public/frames/<slug>/`.
- `scripts/fetch_all.py` — generates frames for every location in the pool.
- `lib/puzzle.ts` — builds the pool from the JSON and picks the deterministic
  daily puzzle (by UTC day) + puzzle number + next-unlock time.
- `lib/storage.ts` — per-day `localStorage` so a finished day can't be replayed
  and a refresh restores progress.
- `lib/geo.ts` — haversine distance, compass bearing, scoring, share line.
- `components/Game.tsx` — the game loop: clue panel with crosshair + voluntary
  *Reveal more*, MapLibre answer map, distance/direction feedback, end state with
  score, share grid and a countdown to the next puzzle.

## Before you launch (share-readiness)

- **Set the domain** so share previews resolve: set `NEXT_PUBLIC_SITE_URL` (or
  edit `metadataBase` in `app/layout.tsx`) to your real URL. The share card is
  auto-generated at `app/opengraph-image.tsx` (1200×630).
- **First-run intro** (`components/HowToPlay.tsx`) opens automatically for new
  visitors and is reachable any time via the "How to play" button.
- **Attribution** is in the page footer + the map control (required for the
  imagery and map data — keep it visible).
- **Frames hosting**: `public/frames/` holds ~5 images per location. Fine for a
  small pool on Vercel; move to Blob/S3 if the pool grows large.

## Imagery licence

The free WMTS endpoint is fine for a non-commercial / test build **with
attribution**. Before monetising, render your own tiles from the open
`eox-s2maps` S3 bucket (CC BY 4.0) so you own the images in your own pipeline.
Required attribution: *Sentinel-2 cloudless (s2maps.eu) by EOX IT Services GmbH*.

## Next steps

- Difficulty tiers: tag each puzzle (e.g. by city population) so the daily can
  ramp easy→hard across the week, or offer an easy/hard mode.
- Natural features: extend the generator beyond cities (coastlines, lakes,
  mountains) for visual variety once the city pool feels good.
- Stats & streaks (and, later, an archive of past puzzles behind a pro tier).
- Tune `ZOOM_LEVELS` in the fetch script once you've judged real imagery.
