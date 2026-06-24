#!/usr/bin/env python3
"""
Generate a fair, globally balanced puzzle pool for ZoomOut.

Picks cities as anchor points — a city is recognisable from above, has a ready
name + country for the answer reveal, sits on land, and lets us balance the
selection across the globe. Output replaces data/locations.json, which both the
game and the tile scripts read.

Why cities (not random land points): a random point is usually 500 km of
uniform forest/desert/ocean — unfair and unnameable. A city centre is the
opposite: identifiable and labelled.

Global balance: candidates are bucketed into a lat/lon grid and sampled
round-robin (biggest city in each region first), so a dense region like Europe
can't dominate the pool.

Usage:
    python scripts/generate_locations.py                 # 60 cities, pop >= 100k
    python scripts/generate_locations.py 120 --min-pop 250000 --seed 7
    python scripts/generate_locations.py --out data/locations.json
"""

import argparse
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict
from random import Random

from geonamescache import GeonamesCache


def slugify(name: str) -> str:
    ascii_name = (
        unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    )
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_name).strip("-").lower()
    return slug or "loc"


def generate(count: int, min_pop: int, seed: int, cell_deg: float) -> list[dict]:
    gc = GeonamesCache()
    countries = gc.get_countries()
    cities = gc.get_cities().values()

    candidates = [
        c
        for c in cities
        if c.get("population", 0) >= min_pop
        and -90 <= c["latitude"] <= 90
        and -180 <= c["longitude"] <= 180
    ]

    # bucket into a lat/lon grid so the selection is spatially even
    buckets: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for c in candidates:
        key = (int(c["latitude"] // cell_deg), int(c["longitude"] // cell_deg))
        buckets[key].append(c)
    for cell in buckets.values():
        cell.sort(key=lambda c: -c.get("population", 0))

    rng = Random(seed)
    cells = list(buckets.keys())
    rng.shuffle(cells)

    # round-robin: one city per cell per round (biggest first) until we have count
    selected: list[dict] = []
    rank = 0
    while len(selected) < count and any(len(buckets[k]) > rank for k in cells):
        for k in cells:
            if len(selected) >= count:
                break
            if len(buckets[k]) > rank:
                selected.append(buckets[k][rank])
        rank += 1

    out: list[dict] = []
    seen_slugs: set[str] = set()
    for c in selected:
        country = countries.get(c["countrycode"], {}).get("name", c["countrycode"])
        base = slugify(c["name"])
        slug = base
        n = 2
        while slug in seen_slugs:
            slug = f"{base}-{n}"
            n += 1
        seen_slugs.add(slug)
        out.append(
            {
                "slug": slug,
                "name": f"{c['name']}, {country}",
                "lat": round(c["latitude"], 4),
                "lon": round(c["longitude"], 4),
            }
        )
    return out


def main() -> None:
    # JSON is always written as UTF-8; only the console preview needs this so
    # non-ASCII names (São Paulo, Ürümqi) don't mojibake on Windows terminals.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    p = argparse.ArgumentParser(description="Generate ZoomOut's daily puzzle pool.")
    p.add_argument("count", nargs="?", type=int, default=60, help="how many puzzles")
    p.add_argument("--min-pop", type=int, default=100_000, help="population floor")
    p.add_argument("--seed", type=int, default=42, help="RNG seed (reproducible)")
    p.add_argument("--cell-deg", type=float, default=15.0, help="grid cell size")
    p.add_argument(
        "--out",
        default=os.path.join("data", "locations.json"),
        help="output path (default: data/locations.json)",
    )
    args = p.parse_args()

    pool = generate(args.count, args.min_pop, args.seed, args.cell_deg)
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(pool, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote {len(pool)} locations to {args.out}")
    print("Sample:")
    for loc in pool[:8]:
        print(f"  {loc['name']:<32} ({loc['lat']}, {loc['lon']})")
    print("\nNext: python scripts/fetch_all.py   # generate frames for the pool")


if __name__ == "__main__":
    main()
