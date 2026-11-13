/** Alles, was ein Bogen zum Abspielen braucht – einmal aus Form + Fragen abgeleitet. */
import { Copy, getCopy } from "@/brand/copy";
import { Theme, getTheme } from "@/brand/themes";
import { fillVars, slotsFor, configOf } from "@/lib/framework";
import { Form, Question } from "@/lib/types";
import { isPlayable } from "@/question-types";

export interface Survey {
  theme: Theme;
  copy: Copy;
  /** nur die Fragen, die gezeigt werden (leere optionale Plätze fallen weg) */
  questions: Question[];
  /** Platzhalter {event} {thema} {anzahl} ersetzen */
  fill: (text: string) => string;
  /** Fragetext; leere Pflicht-Plätze zeigen das Beispiel */
  labelOf: (q: Question) => string;
}

export function buildSurvey(form: Form, all: Question[]): Survey {
  const theme = getTheme(form.style);
  const ansprache = form.settings?.ansprache ?? theme.ansprache;
  const copy = getCopy(ansprache, theme.emoji);
  const questions = all.filter(isPlayable);
  const fill = (text: string) => fillVars(text, form, { anzahl: questions.length });
  const slots = slotsFor(configOf(form));
  const labelOf = (q: Question) => {
    if (q.label.trim()) return fill(q.label);
    const slot = slots.find((s) => s.id === q.settings.slotId);
    return slot ? fill(slot.beispiel[ansprache]) : "";
  };
  return { theme, copy, questions, fill, labelOf };
}
