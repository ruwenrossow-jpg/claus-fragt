import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Zilla_Slab } from "next/font/google";
import "@/brand/tokens.css";
import "./globals.css";
import { BRAND_ASSETS } from "@/brand/themes";
import { DialogProvider } from "@/components/admin/Dialog";

const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-source-sans" });
const zillaSlab = Zilla_Slab({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-zilla-slab" });

// Absolute Adresse für die Link-Vorschau: Produktion = Haupt-Domain, Preview = Branch-URL, lokal = localhost
const host = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;

export const metadata: Metadata = {
  metadataBase: new URL(host ? `https://${host}` : "http://localhost:3123"),
  title: { default: "Claus fragt", template: "%s · Claus fragt" },
  description: "Kurze, ehrliche Evaluationsbögen von InnoNord – mit Claus.",
  applicationName: "Claus fragt",
  // Kein Login: Bögen und Links sollen nicht in Suchmaschinen landen
  robots: { index: false, follow: false },
  openGraph: { siteName: "Claus fragt", locale: "de_DE", type: "website", images: [BRAND_ASSETS.og] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#bffaff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sourceSans.variable} ${zillaSlab.variable}`}>
      <body>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
