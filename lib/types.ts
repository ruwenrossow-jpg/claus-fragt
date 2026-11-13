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

/** Framework-Konfiguration eines Bogens (Spalte forms.settings, jsonb). */
export interface FormSettings {
  eventTyp?: string;
  eventName?: string;
  thema?: string;
  teach?: boolean;
  menti?: boolean;
  ansprache?: Ansprache;
}

export interface Form {
  id: string;
  /** interner Titel (= Eventname bei neuen Bögen) */
  title: string;
  description: string | null;
  /** "published" wird in der Oberfläche als „Live“ bezeichnet */
  status: FormStatus;
  /** Style-id (inspire | implement | network), siehe lib/styles.ts */
  style: string | null;
  settings?: FormSettings | null;
  public_slug?: string | null;
  created_at: string;
  updated_at: string;
}

export type MascotSide = "auto" | "left" | "right";

/** Frei erweiterbare Einstellungen je Frage (jsonb-Spalte, keine Migration nötig). */
export interface QuestionSettings {
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  /** Darstellung: "stars" = Skala als Sterne, "levels" = Einfachauswahl als Stufen (score = Position 1–4) */
  display?: "numbers" | "stars" | "levels";
  /** Platz im Framework (lib/framework.ts), fehlt bei eigenen Fragen */
  slotId?: string;
  /** KPI, für die diese Frage zählt */
  kpi?: "transfer" | "ziel" | "teach";
  /** Mehrfachauswahl: höchstens so viele Antworten */
  maxChoices?: number;
  /** Überschrift in der Antwort-Box, z. B. „Bewerten Sie:“ */
  boxTitle?: string;
  placeholder?: string;
  mascotSide?: MascotSide;
}

export interface Question {
  id: string;
  form_id: string;
  position: number;
  /** Schritt im 5er-Framework (1–5), siehe lib/framework.ts */
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

export function isEmptyAnswer(v: AnswerValue | undefined): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}
