import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

// Permite "Adicionar a tela de inicio" no Android/Chrome com o icone da marca.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Rocha Transport",
    description: "Transferts privés avec chauffeur en France.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
