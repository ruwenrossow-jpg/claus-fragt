/**
 * Stile (Themes). forms.style speichert die id. Ein neuer Stil = ein neuer Eintrag hier
 * (+ ggf. eigene Assets unter public/brand/). Farben kommen aus brand/tokens.css.
 */
export interface Theme {
  id: string;
  name: string;
  mascot: { happy: string; sad: string; alt: string };
}

export const THEMES: Theme[] = [
  {
    id: "claus",
    name: "Claus (Weihnachten)",
    mascot: { happy: "/brand/claus-froh.png", sad: "/brand/claus-traurig.png", alt: "Claus, das Maskottchen" },
  },
];

export const DEFAULT_THEME = THEMES[0];

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

export const BRAND_ASSETS = {
  logo: "/brand/innonord-logo.jpg", // weißer Hintergrund → nur auf weißen Flächen verwenden
} as const;
