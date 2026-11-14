import type { Metadata } from "next";
import { BRAND_ASSETS } from "@/brand/themes";
import { formMeta } from "@/lib/data";

/** Seitentitel + Link-Vorschau (WhatsApp, Slack …) mit dem Namen des Bogens. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const meta = await formMeta((await params).slug);
  if (!meta) return { title: "Claus fragt" };
  const description = meta.description?.trim() || "Ein paar kurze Fragen – anonym, mit Ergebnis gleich danach.";
  return {
    title: meta.title,
    description,
    openGraph: { title: `Claus fragt: ${meta.title}`, description, type: "website", locale: "de_DE", siteName: "Claus fragt", images: [BRAND_ASSETS.og] },
  };
}

export default function FillLayout({ children }: { children: React.ReactNode }) {
  return children;
}
