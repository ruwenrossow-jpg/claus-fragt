/**
 * 5-Schritt-Framework als Platz-Gerüst: Jeder Bogen hat dieselben Bereiche in derselben Reihenfolge.
 * Ein Platz sagt, WELCHE ART Frage hingehört und WAS sie herausfinden soll – den Text schreibt die erstellende Person.
 */
import { newQuestion } from "@/question-types";
import { QuestionKind } from "@/question-types/types";
import { getEventType, getStyle } from "./styles";
import { Ansprache, Form, Question, QuestionSettings } from "./types";

export const FRAMEWORK_STEPS = [
  { step: 1, name: "Wer?" },
  { step: 2, name: "Wie war's?" },
  { step: 3, name: "Was bleibt?" },
  { step: 4, name: "Was ändert sich?" },
  { step: 5, name: "Wie weiter?" },
] as const;

export function stepName(step: number | null): string {
  if (step == null) return "Ohne Bereich";
  return FRAMEWORK_STEPS.find((s) => s.step === step)?.name ?? `Schritt ${step}`;
}

/** Fragearten, die „+ Frage in diesem Bereich“ vorschlägt */
export const STEP_KINDS: Record<number, QuestionKind[]> = {
  1: ["single_choice", "multiple_choice"],
  2: ["stars", "single_choice", "scale"],
  3: ["levels", "short_text", "single_choice"],
  4: ["levels", "single_choice", "yes_no"],
  5: ["yes_no", "multiple_choice", "long_text"],
};

export const LEVEL_SETS = {
  transfer: ["Nichts", "Grober Eindruck", "Konkrete Idee", "Direkt anwendbar"],
  teach: ["Nein", "Vielleicht", "Ja, an Einzelne", "Ja, an eine ganze Gruppe"],
} as const;

export interface Slot {
  id: string;
  step: number;
  name: string;
  kind: QuestionKind;
  /** Hilfetext im Editor: was soll die Person hier herausfinden? */
  ziel: string;
  /** grauer Platzhalter, per Klick übernehmbar ({event}, {thema} werden ersetzt) */
  beispiel: Record<Ansprache, string>;
  pflicht: boolean;
  kpi?: QuestionSettings["kpi"];
  /** feste Stufen (KPI) bzw. Vorschläge für Optionen */
  levels?: readonly string[];
  optionenVorschlag?: string[];
  maxChoices?: number;
}

export interface FrameworkConfig {
  style: string | null;
  eventTyp?: string;
  teach?: boolean;
}

const same = (t: string) => ({ du: t, Sie: t });

/** Alle Plätze für eine Konfiguration (Style + Teach bestimmen Ziel- und Weitertragen-Platz). */
export function slotsFor(cfg: FrameworkConfig): Slot[] {
  const style = getStyle(cfg.style);
  const slots: Slot[] = [
    { id: "zielgruppe", step: 1, name: "Zielgruppe", kind: "single_choice", pflicht: true, ziel: "Zu welcher Gruppe gehört die Person? Optionen passend zu deinem Publikum.", beispiel: { du: "Wer bist du heute?", Sie: "Wer sind Sie heute?" }, optionenVorschlag: getEventType(cfg.eventTyp).zielgruppen },
    { id: "gesamteindruck", step: 2, name: "Gesamteindruck", kind: "stars", pflicht: true, ziel: "Ein ehrlicher Gesamteindruck.", beispiel: same("Ehrlich jetzt: Wie war's?") },
    { id: "highlight", step: 2, name: "Highlight", kind: "single_choice", pflicht: false, ziel: "Welcher Programmpunkt kam am besten an?", beispiel: { du: "Was war dein Highlight?", Sie: "Was war Ihr Highlight?" } },
    { id: "transfer", step: 3, name: "Transfer", kind: "levels", pflicht: true, kpi: "transfer", levels: LEVEL_SETS.transfer, ziel: "Was ist inhaltlich angekommen? Die Stufen bleiben gleich, die Frage darfst du auf dein Thema zuschneiden.", beispiel: { du: "Was ist bei dir zu {thema} hängen geblieben?", Sie: "Was ist bei Ihnen zu {thema} hängen geblieben?" } },
    { id: "konkret", step: 3, name: "Konkret", kind: "short_text", pflicht: false, ziel: "Welcher Inhalt genau?", beispiel: same("Ein Stichwort, das hängen bleibt?") },
    { id: "ziel", step: 4, name: "Ziel", kind: "levels", pflicht: true, kpi: "ziel", levels: style.zielLevels, ziel: style.zielHelp, beispiel: style.zielBeispiel },
  ];
  if (cfg.teach) {
    slots.push({ id: "weitertragen", step: 4, name: "Weitertragen", kind: "levels", pflicht: true, kpi: "teach", levels: LEVEL_SETS.teach, ziel: "Wird das Wissen weitergegeben?", beispiel: { du: "Erzählst du davon weiter?", Sie: "Erzählen Sie davon weiter?" } });
  }
  slots.push(
    { id: "wiederkommen", step: 5, name: "Wiederkommen", kind: "yes_no", pflicht: false, ziel: "Würde die Person wiederkommen?", beispiel: { du: "Würdest du wiederkommen?", Sie: "Würden Sie wiederkommen?" } },
    { id: "verbesserung", step: 5, name: "Verbesserung", kind: "multiple_choice", pflicht: false, maxChoices: 2, ziel: "Was sollen wir nächstes Mal anders machen? Trag deine eigenen Optionen ein.", beispiel: same("Was hätte es noch besser gemacht?") },
    { id: "ein_satz", step: 5, name: "Ein Satz", kind: "long_text", pflicht: false, ziel: "Platz für alles andere.", beispiel: same("Ein Satz an uns?") }
  );
  return slots;
}

export function configOf(form: Form): FrameworkConfig {
  return { style: form.style, eventTyp: form.settings?.eventTyp, teach: form.settings?.teach };
}

export function slotOf(q: Question, form: Form): Slot | undefined {
  return q.settings.slotId ? slotsFor(configOf(form)).find((s) => s.id === q.settings.slotId) : undefined;
}

/** Ersetzt {event}, {thema}, {anzahl} – mit lesbaren Ersatztexten, falls leer. */
export function fillVars(text: string, form: Pick<Form, "settings" | "title">, extra: Record<string, string | number> = {}): string {
  const vars: Record<string, string | number> = {
    event: form.settings?.eventName || form.title || "das Event",
    thema: form.settings?.thema || "dem Thema",
    ...extra,
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Legt die Frage für einen Platz an: Typ, Stufen/Vorschläge, Pflicht und KPI sind schon richtig eingestellt. */
export function questionForSlot(formId: string, slot: Slot): Question {
  const q = newQuestion(formId, slot.kind);
  return {
    ...q,
    step: slot.step,
    required: slot.pflicht,
    options: slot.levels ? [...slot.levels] : slot.optionenVorschlag ? [...slot.optionenVorschlag] : q.options.length && slot.kind !== "single_choice" && slot.kind !== "multiple_choice" ? q.options : [],
    settings: { ...q.settings, slotId: slot.id, ...(slot.kpi && { kpi: slot.kpi }), ...(slot.maxChoices && { maxChoices: slot.maxChoices }) },
  };
}

export function questionsForForm(formId: string, cfg: FrameworkConfig): Question[] {
  return slotsFor(cfg).map((s, i) => ({ ...questionForSlot(formId, s), position: i }));
}

/** Fester Bereich zuerst, innerhalb des Bereichs die vorhandene Reihenfolge. Fragen ohne Bereich ans Ende. */
export function sortByStep(questions: Question[]): Question[] {
  return questions.map((q, i) => ({ q, i })).sort((a, b) => (a.q.step ?? 99) - (b.q.step ?? 99) || a.i - b.i).map((x) => x.q);
}
