import type { Metadata } from "next";
import { Archivo_Black, Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-hub",
});

export const metadata: Metadata = {
  title: "Dashboard — Clic et Moi",
  description: "Hub centralisé : isthatyouremail, gazette, trackmyusers, magic link, contenu ACAD et outils ACAD.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${outfit.variable} ${fraunces.variable} ${archivoBlack.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
