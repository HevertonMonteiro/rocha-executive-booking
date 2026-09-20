import type { Metadata } from "next";

// Paginas do fluxo de reserva: nao devem ser indexadas pelo Google.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
