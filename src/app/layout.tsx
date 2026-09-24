import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Display: titulares y cifras grandes
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

// UI
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Recibo: líneas, factores, operaciones
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoTrack AI — Tu huella de carbono en lenguaje natural",
  description:
    "Cuéntanos tu día. Te devolvemos tu huella. EcoTrack AI estima la huella de carbono de tu pequeño negocio a partir de lo que escribes, y te explica cómo la calculó.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="paper-texture flex min-h-full flex-col bg-paper font-sans text-ink">
        {children}
      </body>
    </html>
  );
}
