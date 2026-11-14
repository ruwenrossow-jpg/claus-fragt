import type { Copy } from "@/brand/copy";
import { AnswerValue, Question } from "@/lib/types";

/**
 * Fragetyp in der Oberfläche. Meist identisch mit dem DB-Typ, außer "stars"
 * (= DB-Typ "scale" mit settings.display = "stars") und "levels" (= "single_choice" mit display = "levels").
 */
export type QuestionKind = "single_choice" | "levels" | "multiple_choice" | "scale" | "stars" | "long_text" | "short_text" | "yes_no" | "info";

export interface InputProps {
  question: Question;
  /** Fragetext mit ersetzten Platzhaltern (Name des Eingabefelds für Screenreader) */
  label: string;
  /** Texte des Bogens (du/Sie) – Platzhalter, Skalen-Beschriftung */
  copy: Copy;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}

export interface EditorProps {
  question: Question;
  onChange: (patch: Partial<Question>) => void;
}

/** Eine Zeile in der Ergebnis-Auswertung. */
export interface ResultOption {
  value: string | number | boolean;
  label: string;
  /** kurze Kennung links neben dem Balken, z. B. „A“ oder „4“ */
  short: string;
}

export interface QuestionTypeDef {
  kind: QuestionKind;
  /** Name im Builder (Auswahl „Frageart“) */
  label: string;
  /** kurze Erklärung unter dem Namen in der Auswahl */
  hint: string;
  /** Standard-Überschrift der Antwort-Box ("" = keine) */
  defaultBoxTitle: string;
  /** Wandelt eine Frage in diesen Typ um (setzt DB-Typ + sinnvolle Standardwerte). */
  apply: (q: Question) => Question;
  /** Eingabe für Teilnehmende (Bogen + Builder-Vorschau) */
  Input: React.ComponentType<InputProps>;
  /** Felder im Builder unter der Frageart (Optionen, Skala …). Fehlt = keine weiteren Felder. */
  Editor?: React.ComponentType<EditorProps>;
  /** Antwortmöglichkeiten für Auswertung/Ergebnis-Screens. Fehlt = nicht auswertbar (Freitext). */
  resultOptions?: (q: Question) => ResultOption[];
  /** Zählt die Antwort für diese Option? (Mehrfachauswahl: Array enthält Wert) */
  matches?: (value: AnswerValue, option: ResultOption) => boolean;
  /** Antwort als Text (CSV, Listen) */
  format: (q: Question, value: AnswerValue | undefined) => string;
}
