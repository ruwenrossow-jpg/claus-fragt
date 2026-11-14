/** Datenbank-Typen (Spiegel der Supabase-Tabellen, siehe supabase/migrations). */

export type DbQuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "scale"
  | "yes_no";

export type FormStatus = "draft" | "published" | "closed";

export type Ansprache = "du" | "Sie";

/**
 * Einstellungen eines Bogens (Spalte forms.settings, jsonb). Neue Bögen brauchen keine davon;
 * ältere Bögen (Builder v1) haben hier Ansprache, Eventname und Thema – die werden weiter gelesen.
 * Weitere Felder aus v1 (eventTyp, teach, menti) bleiben in der DB, werden aber nicht mehr genutzt.
 */
export interface FormSettings {
  /** Standard „du“; „Sie“ nur bei älteren Bögen */
  ansprache?: Ansprache;
  /** v1: ersetzt {event} (sonst gilt der Titel) */
  eventName?: string;
  /** v1: ersetzt {thema} */
  thema?: string;
  /** Soft-Delete: Zeitpunkt (ISO), seit dem der Bogen im Papierkorb liegt. Gelöscht wird in der App nie hart. */
  geloescht?: string | null;
  /** Testbogen (E2E): in „Meine Bögen“ ausgeblendet, nur mit ?tests=1 sichtbar. Darf per REST hart gelöscht werden. */
  test?: boolean;
}

export interface Form {
  id: string;
  /** Name des Bogens (= Eventname, ersetzt {event}) */
  title: string;
  /** Beschreibung; steht auf dem Start-Screen */
  description: string | null;
  /** "published" wird in der Oberfläche als „Live“ bezeichnet */
  status: FormStatus;
  /** Art des Events: "inspire" (Inspirierend) | "network" (Lernend), siehe brand/themes.ts */
  style: string | null;
  settings?: FormSettings | null;
  public_slug?: string | null;
  created_at: string;
  updated_at: string;
}

/** Frei erweiterbare Einstellungen je Frage (jsonb-Spalte, keine Migration nötig). */
export interface QuestionSettings {
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  /** Darstellung: "stars" = Skala als Sterne, "levels" = Einfachauswahl als Stufen (score = Position 1–4) */
  display?: "numbers" | "stars" | "levels";
  /** Framework (v1): Platz-id und KPI. Bleiben im Datenmodell für ein späteres Framework-Konzept, ohne UI. */
  slotId?: string;
  kpi?: "transfer" | "ziel" | "teach";
  /** Mehrfachauswahl: höchstens so viele Antworten */
  maxChoices?: number;
  /** v1: Überschrift in der Antwort-Box (wird noch angezeigt, aber nicht mehr bearbeitet) */
  boxTitle?: string;
  placeholder?: string;
  /** Tafel-Modus (wie Menti): Frage wird gemeinsam am Beamer beantwortet (Freitext = Wortwolke). Ohne laufende Tafel normal im Bogen. */
  tafel?: boolean;
}

export interface Question {
  id: string;
  form_id: string;
  position: number;
  /** Framework (v1): Schritt 1–5. Neue Fragen: null. */
  step: number | null;
  type: DbQuestionType;
  label: string;
  help_text: string | null;
  required: boolean;
  options: string[];
  settings: QuestionSettings;
}

export type AnswerValue = string | string[] | number | boolean | null;

export interface Answer {
  response_id: string;
  question_id: string;
  value: AnswerValue;
}

export const STATUS_LABELS: Record<FormStatus, string> = {
  draft: "Entwurf",
  published: "Live",
  closed: "Geschlossen",
};

/** Liegt der Bogen im Papierkorb? */
export function isTrashed(form: Pick<Form, "settings">): boolean {
  return Boolean(form.settings?.geloescht);
}

/** Eigener Testbogen (E2E)? */
export function isTestForm(form: Pick<Form, "settings">): boolean {
  return form.settings?.test === true;
}

export function isEmptyAnswer(v: AnswerValue | undefined): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}
