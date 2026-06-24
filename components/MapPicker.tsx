"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number };

// The answer surface. Uses MapLibre (WebGL) when available, and falls back to
// Leaflet (raster tiles via DOM/Canvas, no WebGL) so the game stays playable on
// machines/browsers without a working WebGL context. Same OSM data either way —
// deliberately NOT satellite, so the guess map can't reveal the clue.
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIB = "© OpenStreetMap contributors";

type MapApi = {
  showAnswer: (lat: number, lon: number) => void;
  destroy: () => void;
};

type Handlers = { isDisabled: () => boolean; onPick: (p: LatLng) => void };

// Checked after the (async) dynamic import, before any map is created, so a
// React StrictMode double-mount doesn't start two maps on the same container.
type IsActive = () => boolean;

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

async function initMapLibre(
  el: HTMLDivElement,
  h: Handlers,
  isActive: IsActive,
): Promise<MapApi | null> {
  const maplibregl = (await import("maplibre-gl")).default;
  if (!isActive()) return null;
  const map = new maplibregl.Map({
    container: el,
    style: {
      version: 8,
      sources: {
        osm: { type: "raster", tiles: [OSM_TILES], tileSize: 256, attribution: OSM_ATTRIB },
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }],
    },
    center: [0, 20],
    zoom: 0.8,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

  let guess: maplibregl.Marker | null = null;
  let answer: maplibregl.Marker | null = null;
  map.on("click", (e) => {
    if (h.isDisabled()) return;
    const p = { lat: e.lngLat.lat, lng: e.lngLat.lng };
    if (!guess) guess = new maplibregl.Marker({ color: "#2563eb" });
    guess.setLngLat([p.lng, p.lat]).addTo(map);
    h.onPick(p);
  });

  return {
    showAnswer(lat, lon) {
      if (!answer) answer = new maplibregl.Marker({ color: "#16a34a" });
      answer.setLngLat([lon, lat]).addTo(map);
      map.flyTo({ center: [lon, lat], zoom: 3.5, duration: 1000 });
    },
    destroy() {
      map.remove();
    },
  };
}

async function initLeaflet(
  el: HTMLDivElement,
  h: Handlers,
  isActive: IsActive,
): Promise<MapApi | null> {
  const L = (await import("leaflet")).default;
  if (!isActive()) return null;
  const map = L.map(el, { worldCopyJump: true, minZoom: 1 }).setView([20, 0], 1);
  L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIB, maxZoom: 12 }).addTo(map);

  // circleMarker = pure vector, no image assets (avoids Leaflet's broken-icon
  // bundling issue).
  let guess: import("leaflet").CircleMarker | null = null;
  let answer: import("leaflet").CircleMarker | null = null;
  map.on("click", (e) => {
    if (h.isDisabled()) return;
    const p = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (!guess) {
      guess = L.circleMarker([p.lat, p.lng], {
        radius: 7, color: "#1d4ed8", fillColor: "#2563eb", fillOpacity: 1, weight: 2,
      }).addTo(map);
    } else {
      guess.setLatLng([p.lat, p.lng]);
    }
    h.onPick(p);
  });

  return {
    showAnswer(lat, lon) {
      if (!answer) {
        answer = L.circleMarker([lat, lon], {
          radius: 7, color: "#15803d", fillColor: "#16a34a", fillOpacity: 1, weight: 2,
        }).addTo(map);
      }
      map.setView([lat, lon], 4);
    },
    destroy() {
      map.remove();
    },
  };
}

export default function MapPicker({
  disabled,
  answer,
  onPick,
}: {
  disabled: boolean;
  answer?: { lat: number; lon: number };
  onPick: (p: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<MapApi | null>(null);
  const disabledRef = useRef(disabled);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (apiRef.current || !containerRef.current) return;
    const el = containerRef.current;
    let active = true;
    const handlers: Handlers = {
      isDisabled: () => disabledRef.current,
      onPick: (p) => onPickRef.current(p),
    };
    const init = hasWebGL() ? initMapLibre : initLeaflet;
    init(el, handlers, () => active).then((api) => {
      if (!api) return;
      if (!active) {
        api.destroy();
        return;
      }
      apiRef.current = api;
    });
    return () => {
      active = false;
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

  // reveal the answer when the game is over
  useEffect(() => {
    if (answer && apiRef.current) apiRef.current.showAnswer(answer.lat, answer.lon);
  }, [answer]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full overflow-hidden rounded-xl ring-1 ring-border md:h-72"
      aria-label="World map. Click to place your guess."
    />
  );
}
