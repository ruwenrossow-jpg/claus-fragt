/**
 * Art des Events = Ton des Bogens. forms.style speichert die id.
 * Inspirierend (inspire): mit Emojis, verspielter. Lernend (network): ohne Emojis, sachlicher.
 * Farben kommen aus brand/tokens.css; weitere Maskottchen kommen als PNG nach public/brand/.
 */
import { Ansprache } from "@/lib/types";

export type ThemeId = "inspire" | "network";

export interface Theme {
  id: ThemeId;
  name: string;
  /** Erklärung beim Anlegen */
  hint: string;
  ansprache: Ansprache;
  /** Emojis in den Standardtexten */
  emoji: boolean;
  mascot: { happy: string; sad: string; alt: string };
}

const CLAUS = { happy: "/brand/claus-froh.png", sad: "/brand/claus-traurig.png", alt: "Claus, das Maskottchen" };

export const THEMES: Theme[] = [
  { id: "inspire", name: "Inspirierend", hint: "Lust auf mehr machen – z. B. Ausstellung, Schulklasse, Hackathon", ansprache: "du", emoji: true, mascot: CLAUS },
  { id: "network", name: "Lernend", hint: "Wissen vermitteln – z. B. Workshop, Fachtagung, Schulung", ansprache: "du", emoji: false, mascot: CLAUS },
];

/** Ältere Bögen: "implement" läuft als Lernend, "claus"/leer als Inspirierend. */
export function getTheme(id: string | null | undefined): Theme {
  if (id === "implement") return THEMES[1];
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export const BRAND_ASSETS = {
  logo: "/brand/innonord-logo.jpg", // weißer Hintergrund → nur auf weißen Flächen verwenden
} as const;
