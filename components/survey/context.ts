/** Alles, was ein Bogen zum Abspielen braucht – einmal aus Form + Fragen abgeleitet. */
import { Copy, getCopy } from "@/brand/copy";
import { Theme, getTheme } from "@/brand/themes";
import { legacyLabel } from "@/lib/legacy";
import { fillVars } from "@/lib/text";
import { Form, Question } from "@/lib/types";
import { hasEnoughOptions, isInfo } from "@/question-types";

export interface Survey {
  theme: Theme;
  copy: Copy;
  /** nur die Fragen, die gezeigt werden (ohne Text oder mit < 2 Antworten fallen sie weg) */
  questions: Question[];
  /** Platzhalter {event} {thema} {anzahl} ersetzen */
  fill: (text: string) => string;
  /** Fragetext mit ersetzten Platzhaltern */
  labelOf: (q: Question) => string;
}

function rawLabel(q: Question, form: Form, theme: Theme): string {
  return q.label.trim() ? q.label : legacyLabel(q, form, form.settings?.ansprache ?? theme.ansprache);
}

/** Fragen, die im Bogen erscheinen (auch für Builder-Vorschau und Hinweise). */
export function playableQuestions(form: Form, all: Question[]): Question[] {
  const theme = getTheme(form.style);
  return all.filter((q) => rawLabel(q, form, theme).trim() !== "" && hasEnoughOptions(q));
}

export function buildSurvey(form: Form, all: Question[]): Survey {
  const theme = getTheme(form.style);
  const copy = getCopy(form.settings?.ansprache ?? theme.ansprache, theme.emoji);
  const questions = playableQuestions(form, all);
  const fill = (text: string) => fillVars(text, form, { anzahl: questions.filter((q) => !isInfo(q)).length });
  return { theme, copy, questions, fill, labelOf: (q) => fill(rawLabel(q, form, theme)) };
}
