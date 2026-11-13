import { AnswerValue, Question } from "@/lib/types";

/**
 * Fragetyp in der Oberfläche. Meist identisch mit dem DB-Typ, außer "stars"
 * (= DB-Typ "scale" mit settings.display = "stars") und "levels" (= "single_choice" mit display = "levels").
 */
export type QuestionKind = "single_choice" | "levels" | "multiple_choice" | "scale" | "stars" | "long_text" | "short_text" | "yes_no";

export interface InputProps {
  question: Question;
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
  /** Name im Builder */
  label: string;
  /** Standard-Überschrift der Antwort-Box ("" = keine) */
  defaultBoxTitle: string;
  /** Eine Antwort genügt → im Bogen automatisch weiter (wenn das Theme es erlaubt), kein WEITER!-Button */
  autoAdvance: boolean;
  /** Wandelt eine Frage in diesen Typ um (setzt DB-Typ + sinnvolle Standardwerte). */
  apply: (q: Question) => Question;
  /** Eingabe für Teilnehmende (Bogen + Builder-Vorschau) */
  Input: React.ComponentType<InputProps>;
  /** Zusätzliche Felder im Builder (Optionen, Skala …) */
  Editor?: React.ComponentType<EditorProps>;
  /** Antwortmöglichkeiten für Auswertung/Ergebnis-Screens. Fehlt = nicht auswertbar (Freitext). */
  resultOptions?: (q: Question) => ResultOption[];
  /** Zählt die Antwort für diese Option? (Mehrfachauswahl: Array enthält Wert) */
  matches?: (value: AnswerValue, option: ResultOption) => boolean;
  /** Antwort als Text (CSV, Listen) */
  format: (q: Question, value: AnswerValue | undefined) => string;
}
