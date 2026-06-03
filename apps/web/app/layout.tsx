import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MacroScope Intelligence",
  description: "Global macroeconomic intelligence dashboard for economists, analysts and public institutions."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
