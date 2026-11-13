/**
 * Themes = Ton + Aussehen je Style (lib/styles.ts). forms.style speichert die Style-id.
 * Farben kommen aus brand/tokens.css; weitere Maskottchen kommen als PNG nach public/brand/.
 */
import { Ansprache } from "@/lib/types";

export interface Theme {
  id: string;
  name: string;
  ansprache: Ansprache;
  /** Emojis in den Standardtexten */
  emoji: boolean;
  /** Einfachauswahl, Stufen, Sterne, Skala, Ja/Nein springen nach 400 ms weiter */
  autoAdvance: boolean;
  /** Claus auf Fragen-Screens: immer | nur am Anfang eines Bereichs | nie (nur Start/Ende) */
  mascotOnQuestions: "always" | "stepStart" | "never";
  mascot: { happy: string; sad: string; alt: string };
}

const CLAUS = { happy: "/brand/claus-froh.png", sad: "/brand/claus-traurig.png", alt: "Claus, das Maskottchen" };

export const THEMES: Theme[] = [
  { id: "inspire", name: "Inspire", ansprache: "du", emoji: true, autoAdvance: true, mascotOnQuestions: "always", mascot: CLAUS },
  { id: "network", name: "Network", ansprache: "du", emoji: false, autoAdvance: true, mascotOnQuestions: "stepStart", mascot: CLAUS },
  { id: "implement", name: "Implement", ansprache: "Sie", emoji: false, autoAdvance: true, mascotOnQuestions: "never", mascot: CLAUS },
];

/** Alte Bögen (style "claus" oder leer) laufen als Inspire = bisheriger Look. */
export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export const BRAND_ASSETS = {
  logo: "/brand/innonord-logo.jpg", // weißer Hintergrund → nur auf weißen Flächen verwenden
} as const;
