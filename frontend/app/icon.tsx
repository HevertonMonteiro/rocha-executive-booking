import { ImageResponse } from "next/og";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "#e0b84a", fontSize: 30, fontWeight: 800, fontFamily: "Arial, Helvetica, sans-serif" }}>R</span>
      </div>
    ),
    { ...size }
  );
}
