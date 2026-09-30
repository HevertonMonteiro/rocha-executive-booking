import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Imagem mostrada quando o link e compartilhado (WhatsApp, Facebook, etc.).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b1220",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 28,
            background: "#111a2e",
            border: "2px solid #e0b84a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
          }}
        >
          <span style={{ color: "#e0b84a", fontSize: 96, fontWeight: 800 }}>R</span>
        </div>
        <div style={{ color: "#f5f0e6", fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>{SITE_NAME}</div>
        <div style={{ color: "#e0b84a", fontSize: 30, marginTop: 16 }}>Transfert privé avec chauffeur en France</div>
      </div>
    ),
    { ...size }
  );
}
