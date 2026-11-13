/**
 * KPI Wissenstransfer. Stufen-Fragen haben score 1–4 (Position der Option); „Treffer“ = Stufe 3 oder 4.
 * Transfer und Erlebnis sind über alle Events vergleichbar, Ziel nur innerhalb desselben Styles.
 */
import { Answer, Question } from "./types";
import { kindOf, levelScore } from "@/question-types";

export interface Kpi {
  key: string;
  label: string;
  /** Anzeigewert, z. B. „62 %“ oder „4,1 ★“ */
  value: string | null;
  n: number;
  hint: string;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

function levelShare(q: Question | undefined, answers: Answer[]): { share: number | null; n: number } {
  if (!q) return { share: null, n: 0 };
  const scores = answers.filter((a) => a.question_id === q.id).map((a) => levelScore(q, a.value)).filter((s): s is number => s !== null);
  return { share: scores.length ? scores.filter((s) => s >= 3).length / scores.length : null, n: scores.length };
}

export function computeKpis(questions: Question[], answers: Answer[]): Kpi[] {
  const byKpi = (k: string) => questions.find((q) => q.settings.kpi === k && kindOf(q) === "levels");
  const transfer = levelShare(byKpi("transfer"), answers);
  const ziel = levelShare(byKpi("ziel"), answers);
  const teach = levelShare(byKpi("teach"), answers);

  const starsQ = questions.find((q) => q.settings.slotId === "gesamteindruck") ?? questions.find((q) => kindOf(q) === "stars");
  const stars = starsQ ? answers.filter((a) => a.question_id === starsQ.id).map((a) => Number(a.value)).filter((v) => !Number.isNaN(v)) : [];
  const starsAvg = stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : null;
  const starsMax = starsQ?.settings.max ?? 5;

  const gap = starsAvg !== null && transfer.share !== null ? starsAvg / starsMax - transfer.share : null;

  const kpis: Kpi[] = [
    { key: "transfer", label: "Transfer-Score", value: transfer.share === null ? null : pct(transfer.share), n: transfer.n, hint: "Anteil Stufe 3+4 im Transfer-Platz" },
    { key: "ziel", label: "Ziel-Score", value: ziel.share === null ? null : pct(ziel.share), n: ziel.n, hint: "Anteil Stufe 3+4 im Ziel-Platz (nur im selben Style vergleichbar)" },
  ];
  if (byKpi("teach")) kpis.push({ key: "teach", label: "Teach-Score", value: teach.share === null ? null : pct(teach.share), n: teach.n, hint: "Anteil Stufe 3+4: Wissen wird weitergegeben" });
  kpis.push(
    { key: "erlebnis", label: "Erlebnis", value: starsAvg === null ? null : `${starsAvg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ★`, n: stars.length, hint: "Durchschnitt der Sterne" },
    { key: "luecke", label: "Lücke Gefallen vs. Verstanden", value: gap === null ? null : `${gap > 0 ? "+" : ""}${Math.round(gap * 100)} Pkt.`, n: Math.min(stars.length, transfer.n), hint: "Sterne in % minus Transfer-Score – groß = gefallen, aber wenig hängen geblieben" }
  );
  return kpis;
}
