/**
 * Fragetyp-Registry. Ein neuer Fragetyp = eine neue Datei + ein Eintrag in QUESTION_TYPES.
 * Builder, Bogen, Ergebnis-Screens und Auswertung lesen ausschließlich von hier.
 * Anleitung: .claude/skills/neuer-fragetyp/SKILL.md
 */
import { AnswerValue, Answer, Question } from "@/lib/types";
import { multipleChoice, singleChoice } from "./choice";
import { levels } from "./levels";
import { scale, stars } from "./scale";
import { longText, shortText } from "./text";
import { yesNo } from "./yes-no";
import { QuestionKind, QuestionTypeDef, ResultOption } from "./types";
import { letter } from "./letters";

export type { QuestionKind, QuestionTypeDef, ResultOption } from "./types";

/** Reihenfolge = Reihenfolge in der Auswahl „Frageart“ im Builder. */
export const QUESTION_TYPES: QuestionTypeDef[] = [singleChoice, multipleChoice, levels, stars, scale, yesNo, shortText, longText];

const BY_KIND = Object.fromEntries(QUESTION_TYPES.map((t) => [t.kind, t])) as Record<QuestionKind, QuestionTypeDef>;

export function kindOf(q: Question): QuestionKind {
  if (q.type === "scale" && q.settings.display === "stars") return "stars";
  if (q.type === "single_choice" && q.settings.display === "levels") return "levels";
  return q.type;
}

export function typeOf(q: Question): QuestionTypeDef {
  return BY_KIND[kindOf(q)];
}

export function getType(kind: QuestionKind): QuestionTypeDef {
  return BY_KIND[kind];
}

export function boxTitleOf(q: Question): string {
  return q.settings.boxTitle ?? typeOf(q).defaultBoxTitle;
}

export function isAnswerable(q: Question): boolean {
  return Boolean(typeOf(q).resultOptions);
}

export function newQuestion(formId: string, kind: QuestionKind): Question {
  const blank: Question = { id: crypto.randomUUID(), form_id: formId, position: 0, step: null, type: "short_text", label: "", help_text: null, required: false, options: [], settings: {} };
  return getType(kind).apply(blank);
}

export interface Distribution {
  option: ResultOption;
  count: number;
  /** Anteil an allen, die die Frage beantwortet haben (0–1) */
  share: number;
}

/** Verteilung der Antworten auf die Optionen einer Frage. */
export function distribution(q: Question, answers: Answer[]): { total: number; rows: Distribution[] } {
  const def = typeOf(q);
  const options = def.resultOptions?.(q) ?? [];
  const values = answers.filter((a) => a.question_id === q.id).map((a) => a.value);
  const matches = def.matches ?? ((v: AnswerValue, o: ResultOption) => v === o.value);
  const total = values.length;
  return {
    total,
    rows: options.map((option) => {
      const count = values.filter((v) => matches(v, option)).length;
      return { option, count, share: total ? count / total : 0 };
    }),
  };
}

export function average(q: Question, answers: Answer[]): number | null {
  if (q.type !== "scale") return null;
  const nums = answers.filter((a) => a.question_id === q.id).map((a) => Number(a.value)).filter((n) => !Number.isNaN(n));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export { levelScore } from "./levels";

/** Hat eine Auswahlfrage genug Antworten (≥ 2 nicht leere), um im Bogen zu erscheinen? */
export function hasEnoughOptions(q: Question): boolean {
  if (q.type !== "single_choice" && q.type !== "multiple_choice") return true;
  return q.options.filter((o) => o.trim()).length >= 2;
}

/** Builder-Vorschau: die gerade bearbeitete Frage auch ohne Text/Antworten zeigen (Platzhalter statt leer). */
export function withPreviewPlaceholders(q: Question): Question {
  const choice = q.type === "single_choice" || q.type === "multiple_choice";
  return {
    ...q,
    label: q.label.trim() ? q.label : "Deine Frage …",
    options: choice ? q.options.map((o, i) => o.trim() || `Antwort ${letter(i)}`) : q.options,
  };
}
