/** Datenbank-Typen (Spiegel der Supabase-Tabellen, siehe supabase/migrations). */

export type DbQuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "scale"
  | "yes_no";

export type FormStatus = "draft" | "published" | "closed";

export interface Form {
  id: string;
  title: string;
  /** Wird als Begrüßung in der Start-Sprechblase gezeigt (leer = Standardtext). */
  description: string | null;
  status: FormStatus;
  /** Theme-id, siehe brand/themes.ts */
  style: string | null;
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
  /** "stars" = Skala als Sterne-Bewertung */
  display?: "numbers" | "stars";
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
  published: "Veröffentlicht",
  closed: "Geschlossen",
};

export function isEmptyAnswer(v: AnswerValue | undefined): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}
