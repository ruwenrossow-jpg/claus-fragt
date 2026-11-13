export type QuestionType =
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
  description: string | null;
  status: FormStatus;
  style: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScaleSettings {
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface Question {
  id: string;
  form_id: string;
  position: number;
  step: number | null;
  type: QuestionType;
  label: string;
  help_text: string | null;
  required: boolean;
  options: string[];
  settings: ScaleSettings;
}

export type AnswerValue = string | string[] | number | boolean | null;

export interface Answer {
  response_id: string;
  question_id: string;
  value: AnswerValue;
}

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "short_text", label: "Kurze Antwort" },
  { value: "long_text", label: "Absatz" },
  { value: "single_choice", label: "Einfachauswahl" },
  { value: "multiple_choice", label: "Mehrfachauswahl" },
  { value: "scale", label: "Skala" },
  { value: "yes_no", label: "Ja / Nein" },
];

export const STATUS_LABELS: Record<FormStatus, string> = {
  draft: "Entwurf",
  published: "Veröffentlicht",
  closed: "Geschlossen",
};

export function scaleRange(s: ScaleSettings): number[] {
  const min = s.min ?? 1;
  const max = s.max ?? 5;
  const out: number[] = [];
  for (let i = min; i <= max; i++) out.push(i);
  return out;
}
