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

    failed: list[str] = []
    for loc in locations:
        slug = loc["slug"]
        last_frame = os.path.join(
            "public", "frames", slug, f"frame{len(ZOOM_LEVELS)}.jpg"
        )
        if os.path.exists(last_frame) and not force:
            print(f"Skipping {slug} (already generated)")
            continue
        try:
            generate(loc["lat"], loc["lon"], slug)
        except Exception as e:  # keep going; re-run picks up the failures
            print(f"  FAILED {slug}: {e}")
            failed.append(slug)

    done = len(locations) - len(failed)
    print(f"\nDone. {done}/{len(locations)} locations complete.")
    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed)}")
        print("Re-run the script to retry just the missing ones.")


if __name__ == "__main__":
    main()
