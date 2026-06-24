#!/usr/bin/env python3
"""
Generate zoom frames for every location in data/locations.json — the same pool
the game uses for its daily rotation. Run from the project root:

    python scripts/fetch_all.py

Skips locations whose frames already exist (pass --force to regenerate).
"""

import json
import os
import sys

from fetch_tiles import ZOOM_LEVELS, generate


def main() -> None:
    force = "--force" in sys.argv
    here = os.path.dirname(os.path.abspath(__file__))
    pool_path = os.path.join(here, "..", "data", "locations.json")
    with open(pool_path, encoding="utf-8") as f:
        locations = json.load(f)

    for loc in locations:
        slug = loc["slug"]
        last_frame = os.path.join(
            "public", "frames", slug, f"frame{len(ZOOM_LEVELS)}.jpg"
        )
        if os.path.exists(last_frame) and not force:
            print(f"Skipping {slug} (already generated)")
            continue
        generate(loc["lat"], loc["lon"], slug)

    print(f"Done. Generated frames for {len(locations)} locations.")


if __name__ == "__main__":
    main()
