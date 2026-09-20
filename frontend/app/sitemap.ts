import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/parceiro`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/conditions-generales`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
