import { COPY } from "@/brand/copy";
import { Question } from "@/lib/types";
import { commonSettings } from "./settings";
import { EditorProps, InputProps, QuestionTypeDef } from "./types";
import styles from "./inputs.module.css";
import ed from "./editors.module.css";

export function scaleRange(q: Question): number[] {
  const min = q.settings.min ?? 1;
  const max = q.settings.max ?? 5;
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
}

function Labels({ question }: { question: Question }) {
  return (
    <div className={styles.scaleLabels}>
      <span>{question.settings.minLabel ?? COPY.scaleMinLabel}</span>
      <span>{question.settings.maxLabel ?? COPY.scaleMaxLabel}</span>
    </div>
  );
}

function NumberInput({ question, value, onChange }: InputProps) {
  return (
    <>
      <div className={styles.chips} role="radiogroup">
        {scaleRange(question).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} className={`${styles.chip} ${value === n ? styles.chipOn : ""}`} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
      <Labels question={question} />
    </>
  );
}

function Star({ on }: { on: boolean }) {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 1.8l3.1 6.6 7.1.8-5.3 4.9 1.5 7.1L12 17.6l-6.4 3.6 1.5-7.1L1.8 9.2l7.1-.8z"
        fill={on ? "var(--survey-star)" : "var(--survey-neutral)"}
        stroke="var(--survey-ink)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarInput({ question, value, onChange }: InputProps) {
  const current = typeof value === "number" ? value : 0;
  return (
    <>
      <div className={styles.stars} role="radiogroup">
        {scaleRange(question).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} Sterne`} className={styles.star} onClick={() => onChange(n)}>
            <Star on={n <= current} />
          </button>
        ))}
      </div>
      <Labels question={question} />
    </>
  );
}

function ScaleEditor({ question, onChange, maxChoices }: EditorProps & { maxChoices: number[] }) {
  const set = (patch: Partial<Question["settings"]>) => onChange({ settings: { ...question.settings, ...patch } });
  return (
    <div>
      <div className={ed.row}>
        <label>Von</label>
        <select value={question.settings.min ?? 1} onChange={(e) => set({ min: Number(e.target.value) })}>
          {[0, 1].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <label>bis</label>
        <select value={question.settings.max ?? 5} onChange={(e) => set({ max: Number(e.target.value) })}>
          {maxChoices.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className={ed.grid}>
        <input type="text" value={question.settings.minLabel ?? ""} placeholder={`links: ${COPY.scaleMinLabel}`} onChange={(e) => set({ minLabel: e.target.value || undefined })} />
        <input type="text" value={question.settings.maxLabel ?? ""} placeholder={`rechts: ${COPY.scaleMaxLabel}`} onChange={(e) => set({ maxLabel: e.target.value || undefined })} />
      </div>
    </div>
  );
}

function applyScale(q: Question, display: "numbers" | "stars"): Question {
  const { min = 1, max = 5, minLabel, maxLabel } = q.settings;
  return { ...q, type: "scale", options: [], settings: { ...commonSettings(q), min, max, minLabel, maxLabel, display } };
}

const scaleResultOptions = (q: Question) => scaleRange(q).map((n) => ({ value: n, label: String(n), short: String(n) }));

export const scale: QuestionTypeDef = {
  kind: "scale",
  label: "Skala (Zahlen)",
  defaultBoxTitle: "Das ist Ihre Skala:",
  apply: (q) => applyScale(q, "numbers"),
  Input: NumberInput,
  Editor: (p) => <ScaleEditor {...p} maxChoices={[3, 4, 5, 6, 7, 10]} />,
  resultOptions: scaleResultOptions,
  format: (_q, v) => (v == null ? "" : String(v)),
};

export const stars: QuestionTypeDef = {
  kind: "stars",
  label: "Sterne-Bewertung",
  defaultBoxTitle: "Bewerten Sie:",
  apply: (q) => applyScale(q, "stars"),
  Input: StarInput,
  Editor: (p) => <ScaleEditor {...p} maxChoices={[3, 4, 5, 6]} />,
  resultOptions: (q) => scaleResultOptions(q).map((o) => ({ ...o, label: `${o.value}★`, short: `${o.value}★` })),
  format: (_q, v) => (v == null ? "" : `${v} ★`),
};
