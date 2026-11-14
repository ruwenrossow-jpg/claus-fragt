/**
 * Kennzahlen für die Ergebnisseite – funktionieren mit beliebigen Fragen.
 * Eine Kachel erscheint nur, wenn es passende Antworten gibt:
 *   Stufen → Anteil der obersten zwei Stufen · Sterne/Skala → Durchschnitt · Ja/Nein → Anteil „Ja“.
 * Das Framework-Konzept (settings.kpi, step) folgt später; die Daten dafür bleiben erhalten.
 */
import { Answer, Question } from "./types";
import { average, kindOf, levelScore } from "@/question-types";

export interface Kpi {
  key: string;
  /** Fragetext (gekürzt) */
  label: string;
  /** Anzeigewert, z. B. „62 %“ oder „4,1 ★“ */
  value: string;
  /** Wie wird gerechnet? */
  hint: string;
  n: number;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;
const num = (x: number) => x.toLocaleString("de-DE", { maximumFractionDigits: 1 });

export function computeKpis(questions: Question[], answers: Answer[], labelOf: (q: Question) => string): Kpi[] {
  const out: Kpi[] = [];
  for (const q of questions) {
    const values = answers.filter((a) => a.question_id === q.id).map((a) => a.value);
    if (!values.length) continue;
    const base = { key: q.id, label: labelOf(q) || "(ohne Fragetext)", n: values.length };
    const kind = kindOf(q);
    if (kind === "levels") {
      const scores = values.map((v) => levelScore(q, v)).filter((s): s is number => s !== null);
      const top = q.options.length - 1; // die obersten zwei Stufen
      if (scores.length) out.push({ ...base, value: pct(scores.filter((s) => s >= top).length / scores.length), hint: `Anteil „${q.options[top - 1]}“ + „${q.options[top]}“`, n: scores.length });
    } else if (kind === "stars" || kind === "scale") {
      const avg = average(q, answers);
      if (avg !== null) out.push({ ...base, value: kind === "stars" ? `${num(avg)} ★` : num(avg), hint: `Durchschnitt (${q.settings.min ?? 1}–${q.settings.max ?? 5})` });
    } else if (kind === "yes_no") {
      out.push({ ...base, value: pct(values.filter((v) => v === true).length / values.length), hint: "Anteil „Ja“" });
    }
  }
  return out;
}
