/**
 * Hinweise im Editor: warnen statt blockieren. Speichern und Live schalten bleiben immer möglich.
 * Grundlage: Tonalitätsregeln (brand/copy.ts).
 */
import { Question } from "./types";
import { wordCount } from "./text";

export interface Warning {
  text: string;
}

const AMTSDEUTSCH = ["bewerten sie", "inwiefern", "veranstaltung", "sonstige anmerkungen", "hinsichtlich", "bezüglich", "zufriedenheit"];
const ZUKUNFT = ["in zwei wochen", "in einem monat", "in zukunft", "künftig", "zukünftig", "später einmal"];

/** Tonalität eines Fragetexts */
export function toneWarnings(text: string): Warning[] {
  const t = text.toLowerCase();
  const out: Warning[] = [];
  if (wordCount(text) > 12) out.push({ text: `${wordCount(text)} Wörter – kürzer liest sich leichter.` });
  const amt = AMTSDEUTSCH.find((w) => t.includes(w));
  if (amt) out.push({ text: `„${amt}“ klingt nach Amt – sag es einfacher.` });
  const fut = ZUKUNFT.find((w) => t.includes(w));
  if (fut) out.push({ text: `„${fut}“: Frag lieber nach dem Jetzt.` });
  return out;
}

const isChoice = (q: Question) => q.type === "single_choice" || q.type === "multiple_choice";

/** Hinweise zu einer Frage (Text, Optionen) */
export function questionWarnings(q: Question): Warning[] {
  const out = toneWarnings(q.label);
  if (isChoice(q) && q.options.filter((o) => o.trim()).length < 2) out.push({ text: "Mindestens 2 Antworten eintragen, sonst fehlt die Frage im Bogen." });
  return out;
}

/** Alle Hinweise vor dem Live schalten */
export function formWarnings(questions: Question[], playableCount: number): Warning[] {
  const out: Warning[] = [];
  if (playableCount === 0) out.push({ text: "Der Bogen hat noch keine Frage." });
  if (playableCount > 12) out.push({ text: `${playableCount} Fragen – ab etwa 12 steigt die Abbruchgefahr.` });
  if (questions.some((q) => !q.label.trim())) out.push({ text: "Fragen ohne Text werden im Bogen weggelassen." });
  questions.forEach((q, i) => questionWarnings(q).forEach((w) => out.push({ text: `Frage ${i + 1}: ${w.text}` })));
  return out;
}
