/**
 * Standardtexte (Tonalität). Wird ersetzt/erweitert, sobald die Tonalitätsregeln stehen.
 * {anzahl} wird durch die Zahl der Fragen ersetzt.
 */
export const COPY = {
  startBubble: "Hey, hast du Bock auf {anzahl} schnelle Fragen?!",
  overBubble: "Oh du bist ja schon fertig, schnief schnief",
  doneBubble: "Danke fürs Mitmachen! Bis zum nächsten Mal!",
  closedBubble: "Dieser Bogen ist leider schon geschlossen.",
  back: "zurück",
  buttons: { start: "START!", next: "WEITER!", result: "ERGEBNIS!", finish: "BEENDEN!" },
  yourAnswer: "Deine Antwort",
  requiredHint: "Bitte beantworte die Frage, bevor es weitergeht.",
  scaleMinLabel: "sehr schlecht",
  scaleMaxLabel: "sehr gut",
  textPlaceholder: "Ihre Antwort hier…",
} as const;

export function fillCopy(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}
