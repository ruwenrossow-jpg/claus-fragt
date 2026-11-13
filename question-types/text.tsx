import { COPY_DEFAULT as COPY } from "@/brand/copy";
import { Question } from "@/lib/types";
import { commonSettings } from "./settings";
import { EditorProps, QuestionTypeDef } from "./types";
import styles from "./inputs.module.css";

function textSettings(q: Question): Question["settings"] {
  return { ...commonSettings(q), placeholder: q.settings.placeholder };
}

function PlaceholderEditor({ question, onChange }: EditorProps) {
  return (
    <input
      type="text"
      value={question.settings.placeholder ?? ""}
      placeholder={`Platzhalter im Feld (Standard: ${COPY.placeholder.text})`}
      onChange={(e) => onChange({ settings: { ...question.settings, placeholder: e.target.value || undefined } })}
    />
  );
}

export const longText: QuestionTypeDef = {
  kind: "long_text",
  autoAdvance: false,
  label: "Offene Antwort",
  defaultBoxTitle: "",
  apply: (q) => ({ ...q, type: "long_text", options: [], settings: textSettings(q) }),
  Input: ({ question, value, onChange }) => (
    <textarea
      className={`${styles.field} ${styles.textarea}`}
      value={typeof value === "string" ? value : ""}
      placeholder={question.settings.placeholder || COPY.placeholder.text}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  Editor: PlaceholderEditor,
  format: (_q, v) => (typeof v === "string" ? v : ""),
};

export const shortText: QuestionTypeDef = {
  kind: "short_text",
  autoAdvance: false,
  label: "Kurze Antwort",
  defaultBoxTitle: "",
  apply: (q) => ({ ...q, type: "short_text", options: [], settings: textSettings(q) }),
  Input: ({ question, value, onChange }) => (
    <input
      type="text"
      className={styles.field}
      value={typeof value === "string" ? value : ""}
      placeholder={question.settings.placeholder || COPY.placeholder.text}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  Editor: PlaceholderEditor,
  format: (_q, v) => (typeof v === "string" ? v : ""),
};
