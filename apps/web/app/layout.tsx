import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "500"], display: "swap" });
const basePath = process.env.GITHUB_PAGES === "true" ? "/Macroeconomic-Dashboard" : "";
const faviconPath = `${basePath}/favicon.png`;

export const metadata: Metadata = {
  title: "Macroeconomic Atlas \u00b7 @lozpastor",
  description: "Atlas macroeconomico minimalista para explorar indicadores macroeconomicos, comercio, mercados y divisas.",
  icons: {
    icon: faviconPath,
    shortcut: faviconPath,
    apple: faviconPath
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
