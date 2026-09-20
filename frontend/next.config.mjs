const producao = process.env.NODE_ENV === "production";

// Origem do Supabase Storage (fotos da frota/destinos), quando configurado.
let origemStorage = "";
try {
  if (process.env.SUPABASE_URL) origemStorage = new URL(process.env.SUPABASE_URL).origin;
} catch {
  /* URL invalida: ignora */
}

// Politica de seguranca de conteudo. A SumUp precisa de script, conexoes e
// frames (3D Secure) proprios: se o pagamento falhar em um ambiente novo,
// confira o console do navegador por violacoes de CSP.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${producao ? "" : " 'unsafe-eval'"} https://gateway.sumup.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${origemStorage}`.trim(),
  "font-src 'self' data:",
  "connect-src 'self' https://*.sumup.com https://*.sumup.io",
  "frame-src https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(producao ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cabecalhosSeguranca = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(producao ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // O site usa <img> comum: desliga o otimizador de imagens (/_next/image), uma superficie de ataque a menos.
  images: { unoptimized: true },
  eslint: {
    // O projeto nao inclui devDependencies de ESLint; evita falha no build
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Drivers de banco ficam fora do bundle (carregados do node_modules em runtime).
    serverComponentsExternalPackages: ["postgres", "@electric-sql/pglite", "@supabase/supabase-js"],
    // PGlite so existe em desenvolvimento: nao entra nas funcoes da Netlify.
    outputFileTracingExcludes: { "*": ["node_modules/@electric-sql/pglite/**"] },
  },
  async redirects() {
    // A home passou de /busca para a raiz; mantem links antigos funcionando.
    return [
      { source: "/busca", destination: "/", permanent: true },
      { source: "/termos", destination: "/conditions-generales", permanent: true },
      { source: "/privacidade", destination: "/confidentialite", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...cabecalhosSeguranca, ...(producao ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }])] },
      {
        // Area administrativa: nunca em cache e fora dos buscadores.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
