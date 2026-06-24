import { ImageResponse } from "next/og";

// Auto-generated share card shown when the link is posted to Reddit/X/Discord.
export const alt = "ZoomOut — the daily satellite guessing game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: 80,
          background: "linear-gradient(135deg, #0b1120 0%, #1c2740 100%)",
          color: "#e8edf5",
          fontFamily: "sans-serif",
        }}
      >
        {/* the "clue" square with a crosshair */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 380,
            height: 380,
            flexShrink: 0,
            borderRadius: 32,
            background: "linear-gradient(160deg, #24407a 0%, #16321f 100%)",
            border: "6px solid #fbbf24",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 150,
              left: 150,
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "6px solid #fbbf24",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 184,
              left: 184,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#fbbf24",
              display: "flex",
            }}
          />
        </div>

        {/* wordmark + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 120, fontWeight: 800 }}>
            <span>Zoom</span>
            <span style={{ color: "#fbbf24" }}>Out</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 40,
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            The daily satellite puzzle
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 30,
              color: "#cbd5e1",
              maxWidth: 560,
            }}
          >
            Where on Earth is this? Read the clue, drop a pin.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
