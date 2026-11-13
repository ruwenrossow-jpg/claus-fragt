/**
 * Warnungen im Editor: warnen statt blockieren. Speichern und Live schalten bleiben immer möglich.
 * Grundlage: Tonalitätsregeln (brand/copy.ts) und Framework-Regeln (lib/framework.ts).
 */
import { isPlayable, kindOf } from "@/question-types";
import { Slot, slotOf } from "./framework";
import { Form, Question } from "./types";

export interface Warning {
  text: string;
}

const AMTSDEUTSCH = ["bewerten sie", "inwiefern", "veranstaltung", "sonstige anmerkungen", "hinsichtlich", "bezüglich", "zufriedenheit"];
const ZUKUNFT = ["in zwei wochen", "in einem monat", "in zukunft", "künftig", "zukünftig", "später einmal"];

export const TONE_TIPS = [
  "Kurz: max. 10 Wörter",
  "Eine Sache pro Frage",
  "Auftrag statt Frage: „Sag uns ehrlich …“",
  "Kein Amtsdeutsch",
  "Ehrlichkeit einladen",
  "Keine hypothetische Zukunft",
];

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Tonalität eines Fragetexts */
export function toneWarnings(text: string): Warning[] {
  const t = text.toLowerCase();
  const out: Warning[] = [];
  if (wordCount(text) > 10) out.push({ text: `${wordCount(text)} Wörter – kürzer ist besser (max. 10).` });
  const amt = AMTSDEUTSCH.find((w) => t.includes(w));
  if (amt) out.push({ text: `„${amt}“ klingt nach Amt – sag es einfacher.` });
  if (/\b(und|sowie)\b/.test(t)) out.push({ text: "„und“/„sowie“: Fragst du zwei Dinge auf einmal? Eine Sache pro Frage." });
  const fut = ZUKUNFT.find((w) => t.includes(w));
  if (fut) out.push({ text: `„${fut}“: Keine hypothetische Zukunft – frag nach dem Jetzt.` });
  return out;
}

/** Warnungen einer Frage (Tonalität, Optionen, Pflicht, KPI-Vergleichbarkeit) */
export function questionWarnings(q: Question, slot: Slot | undefined): Warning[] {
  const out = toneWarnings(q.label);
  const longOption = q.options.find((o) => wordCount(o) > 4);
  if (longOption) out.push({ text: `Option „${longOption}“ hat mehr als 4 Wörter.` });
  if (slot?.pflicht && !q.label.trim()) out.push({ text: "Pflicht-Platz ohne eigenen Text – es wird das Beispiel verwendet." });
  if ((q.type === "single_choice" || q.type === "multiple_choice") && q.options.filter((o) => o.trim()).length < 2) {
    out.push({ text: slot?.pflicht ? "Mindestens 2 Antworten eintragen, sonst fehlt diese Pflichtfrage im Bogen." : "Ohne mindestens 2 Antworten wird die Frage weggelassen." });
  }
  if (slot?.kpi) {
    if (kindOf(q) !== "levels") out.push({ text: "Ohne Stufen kein KPI – diese Frage zählt nicht mehr für den Vergleich." });
    else if (slot.levels && q.options.join("|") !== slot.levels.join("|")) out.push({ text: "Stufen geändert – der KPI ist nicht mehr mit anderen Events vergleichbar." });
  }
  return out;
}

/** Warnungen zum Umfang des Bogens (Anzahl, offene Fragen) */
export function scopeWarnings(questions: Question[]): Warning[] {
  const playable = questions.filter(isPlayable);
  const out: Warning[] = [];
  if (playable.length > 12) out.push({ text: `${playable.length} Fragen: Über 4 Minuten – die Abbruchgefahr steigt.` });
  if (playable.length < 6) out.push({ text: `Erst ${playable.length} Fragen – 6 bis 12 sind ideal.` });
  const open = playable.filter((q) => q.type === "long_text");
  if (open.length > 1) out.push({ text: "Mehr als eine offene Frage – höchstens eine, optional, am Ende." });
  return out;
}

/** Alle Warnungen (Umfang + je Frage) – Zusammenfassung beim Live schalten */
export function formWarnings(form: Form, questions: Question[]): Warning[] {
  const out = scopeWarnings(questions);
  for (const q of questions) {
    const slot = slotOf(q, form);
    for (const w of questionWarnings(q, slot)) out.push({ text: `${slot?.name ?? (q.label || "Eigene Frage")}: ${w.text}` });
  }
  return out;
}
