import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Vendeon AI — Plataforma de vendas",
  description: "Central inteligente de vendas, clientes e agentes de IA."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
