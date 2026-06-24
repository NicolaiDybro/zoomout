#!/usr/bin/env python3
"""
ZoomOut tile fetcher.

Pulls cloud-free Sentinel-2 imagery (EOX s2cloudless, open data, CC BY) for a
given lat/lon at several zoom levels, stitches a 2x2 grid of tiles at each level
and crops the centre so the target location always sits in the middle of the
frame. Output: square JPGs in public/frames/<slug>/frame{1..N}.jpg, frame1 being
the most zoomed-in (hardest) and frameN the most zoomed-out (easiest).

Usage:
    python scripts/fetch_tiles.py                  # default: Venice
    python scripts/fetch_tiles.py 35.36 138.73     # Mt. Fuji
    python scripts/fetch_tiles.py 35.36 138.73 fuji

License note: the free WMTS endpoint is fine for a non-commercial / testing
build with attribution. Before monetising, switch to your own tiles rendered
from the open eox-s2maps S3 bucket (CC BY 4.0). Attribution required either way:
"Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH".
"""

import io
import math
import os
import sys
import time

import requests
from PIL import Image

# s2cloudless WMTS, Web Mercator (EPSG:3857 / "g" GoogleMapsCompatible matrix set)
TILE_URL = (
    "https://tiles.maps.eox.at/wmts/1.0.0/"
    "s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"
)
TILE_SIZE = 256          # px per tile
OUT_SIZE = 512           # px of the final cropped frame
# frame1 .. frameN : most zoomed-in (hard) -> most zoomed-out (easy).
# z=14 is Sentinel-2's native limit (~9.5 m/px) — the sharpest meaningful zoom.
# Going higher just upscales the same 10 m data into blur, so don't exceed 14.
# (If the WMTS endpoint returns blank/errors at 14, it caps lower — drop to 13.)
ZOOM_LEVELS = [14, 12, 10, 8, 6]

HEADERS = {"User-Agent": "ZoomOut/0.1 (daily geo puzzle; dev build)"}


def lonlat_to_pixel(lon: float, lat: float, z: int) -> tuple[float, float]:
    """Web-Mercator global pixel coords (256px tiles) for a lon/lat at zoom z."""
    n = TILE_SIZE * (2 ** z)
    x = (lon + 180.0) / 360.0 * n
    lat_rad = math.radians(lat)
    y = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return x, y


def fetch_tile(z: int, x: int, y: int, retries: int = 5) -> Image.Image:
    """Fetch one tile, retrying transient network/server errors with backoff.

    The EOX endpoint occasionally resets the connection or rate-limits under a
    rapid sequential load, so a single failure must not abort the whole run.
    """
    url = TILE_URL.format(z=z, x=x, y=y)
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
            r.raise_for_status()
            img = Image.open(io.BytesIO(r.content)).convert("RGB")
            time.sleep(0.05)  # be polite — avoid tripping rate limits
            return img
        except (requests.RequestException, OSError) as e:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))  # 1.5s, 3s, 4.5s, 6s
    raise RuntimeError("unreachable")


def fetch_frame(lon: float, lat: float, z: int) -> Image.Image:
    """Stitch a 2x2 tile grid around the point and crop OUT_SIZE px centred on it."""
    px, py = lonlat_to_pixel(lon, lat, z)
    # top-left tile of a 2x2 block such that the point is near the centre
    tx = int(px // TILE_SIZE)
    ty = int(py // TILE_SIZE)
    # shift the block so the point sits closer to the centre of the 2x2 canvas
    if px - tx * TILE_SIZE < TILE_SIZE / 2:
        tx -= 1
    if py - ty * TILE_SIZE < TILE_SIZE / 2:
        ty -= 1

    max_t = 2 ** z
    canvas = Image.new("RGB", (TILE_SIZE * 2, TILE_SIZE * 2))
    for dx in range(2):
        for dy in range(2):
            txi = (tx + dx) % max_t
            tyi = ty + dy
            if tyi < 0 or tyi >= max_t:
                continue
            tile = fetch_tile(z, txi, tyi)
            canvas.paste(tile, (dx * TILE_SIZE, dy * TILE_SIZE))

    # the point's pixel position inside the 2x2 canvas
    cx = px - tx * TILE_SIZE
    cy = py - ty * TILE_SIZE
    left = int(cx - OUT_SIZE / 2)
    top = int(cy - OUT_SIZE / 2)
    left = max(0, min(left, TILE_SIZE * 2 - OUT_SIZE))
    top = max(0, min(top, TILE_SIZE * 2 - OUT_SIZE))
    return canvas.crop((left, top, left + OUT_SIZE, top + OUT_SIZE))


def generate(lat: float, lon: float, slug: str) -> None:
    """Fetch and save all zoom frames for one location into public/frames/<slug>/."""
    out_dir = os.path.join("public", "frames", slug)
    os.makedirs(out_dir, exist_ok=True)

    print(f"Fetching {slug} @ ({lat}, {lon})")
    for i, z in enumerate(ZOOM_LEVELS, start=1):
        frame = fetch_frame(lon, lat, z)
        path = os.path.join(out_dir, f"frame{i}.jpg")
        frame.save(path, "JPEG", quality=85)
        print(f"  frame{i} (z={z:>2}) -> {path}")


def main() -> None:
    lat = float(sys.argv[1]) if len(sys.argv) > 1 else 45.4408   # Venice
    lon = float(sys.argv[2]) if len(sys.argv) > 2 else 12.3155
    slug = sys.argv[3] if len(sys.argv) > 3 else "venice"
    generate(lat, lon, slug)
    print("Done. Open the frames to judge whether the imagery is good enough.")


if __name__ == "__main__":
    main()
