import { ImageResponse } from "next/og";

// Icone usado pelo iOS ao "Adicionar a tela de inicio" (precisa ser PNG, sem cantos
// arredondados: o proprio iOS aplica a mascara).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <span style={{ color: "#e0b84a", fontSize: 108, fontWeight: 800, fontFamily: "Arial, Helvetica, sans-serif" }}>R</span>
      </div>
    ),
    { ...size }
  );
}
