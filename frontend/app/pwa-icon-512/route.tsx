import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "#e0b84a", fontSize: 310, fontWeight: 800, fontFamily: "Arial, Helvetica, sans-serif" }}>R</span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
