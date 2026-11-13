import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Zilla_Slab } from "next/font/google";
import "@/brand/tokens.css";
import "./globals.css";

const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-source-sans" });
const zillaSlab = Zilla_Slab({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-zilla-slab" });

export const metadata: Metadata = {
  title: "Claus fragt",
  description: "Evaluationsbögen für InnoNord",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#bffaff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sourceSans.variable} ${zillaSlab.variable}`}>
      <body>{children}</body>
    </html>
  );
}
