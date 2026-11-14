/**
 * Excel-Export der Ergebnisse: Blatt „Antworten“ = eine Zeile pro Person, eine Spalte pro Frage (Sterne/Skala als Zahl);
 * Blatt „Übersicht“ = je Frage die Verteilung (Anzahl, Anteil) bzw. der Durchschnitt.
 */
import { average, distribution, isAnswerable, typeOf } from "@/question-types";
import { Answer, Question } from "./types";
import { Cell, Sheet, buildXlsx } from "./xlsx";

export interface ExportData {
  questions: Question[];
  responses: { id: string; created_at: string }[];
  answers: Answer[];
  labelOf: (q: Question) => string;
}

export function resultsWorkbook({ questions, responses, answers, labelOf }: ExportData): Blob {
  const asked = questions.filter((q) => answers.some((a) => a.question_id === q.id));
  const byResponse = new Map<string, Map<string, Answer>>();
  for (const a of answers) {
    if (!byResponse.has(a.response_id)) byResponse.set(a.response_id, new Map());
    byResponse.get(a.response_id)!.set(a.question_id, a);
  }
  const people = [...responses].filter((r) => byResponse.has(r.id)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const cell = (q: Question, a: Answer | undefined): Cell => {
    if (!a) return "";
    if (q.type === "scale" && typeof a.value === "number") return a.value;
    return typeOf(q).format(q, a.value);
  };
  const header = ["Nr.", "Zeitpunkt", ...asked.map((q, i) => `${i + 1}. ${labelOf(q).trim() || "Frage ohne Text"}`)];
  const rows: Cell[][] = people.map((r, i) => {
    const own = byResponse.get(r.id)!;
    return [i + 1, new Date(r.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }), ...asked.map((q) => cell(q, own.get(q.id)))];
  });
  const antworten: Sheet = {
    name: "Antworten",
    rows: [header, ...rows],
    widths: [6, 16, ...asked.map((q) => (q.type === "long_text" || q.type === "short_text" ? 40 : 22))],
  };

  const overview: Cell[][] = [["Frage", "Antwort", "Anzahl", "Anteil in %"]];
  asked.forEach((q, i) => {
    const title = `${i + 1}. ${labelOf(q).trim() || "Frage ohne Text"}`;
    const own = answers.filter((a) => a.question_id === q.id);
    if (!isAnswerable(q)) {
      overview.push([title, `${own.length} Textantworten (siehe Blatt „Antworten“)`, own.length, ""]);
    } else {
      const { rows: dist } = distribution(q, answers);
      dist.forEach(({ option, count, share }, j) => overview.push([j === 0 ? title : "", option.label, count, Math.round(share * 1000) / 10]));
      const avg = average(q, answers);
      if (avg !== null) overview.push(["", "Durchschnitt", Math.round(avg * 100) / 100, ""]);
    }
    overview.push([]);
  });
  return buildXlsx([antworten, { name: "Übersicht", rows: overview, widths: [44, 34, 10, 12] }]);
}
