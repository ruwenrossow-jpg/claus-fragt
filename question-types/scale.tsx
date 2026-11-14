import { COPY_DEFAULT as COPY, Copy, plural } from "@/brand/copy";
import { Question } from "@/lib/types";
import { commonSettings } from "./settings";
import { EditorProps, InputProps, QuestionTypeDef } from "./types";
import { Select } from "@/components/admin/Select";
import styles from "./inputs.module.css";
import ed from "./editors.module.css";

function scaleRange(q: Question): number[] {
  const min = q.settings.min ?? 1;
  const max = q.settings.max ?? 5;
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
}

function Labels({ question, copy }: { question: Question; copy: Copy }) {
  return (
    <div className={styles.scaleLabels}>
      <span>{question.settings.minLabel || copy.scale.min}</span>
      <span>{question.settings.maxLabel || copy.scale.max}</span>
    </div>
  );
}

function NumberInput({ question, label, copy, value, onChange }: InputProps) {
  return (
    <>
      <div className={styles.chips} role="radiogroup" aria-label={label}>
        {scaleRange(question).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} className={`${styles.chip} ${value === n ? styles.chipOn : ""}`} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
      <Labels question={question} copy={copy} />
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

function StarInput({ question, label, copy, value, onChange }: InputProps) {
  const current = typeof value === "number" ? value : 0;
  return (
    <>
      <div className={styles.stars} role="radiogroup" aria-label={label}>
        {scaleRange(question).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={plural(n, copy.aria.stars)} className={styles.star} onClick={() => onChange(n)}>
            <Star on={n <= current} />
          </button>
        ))}
      </div>
      <Labels question={question} copy={copy} />
    </>
  );
}

const toOptions = (ns: number[]) => ns.map((n) => ({ value: n, label: String(n) }));

function ScaleEditor({ question, onChange, maxChoices, stars = false }: EditorProps & { maxChoices: number[]; stars?: boolean }) {
  const set = (patch: Partial<Question["settings"]>) => onChange({ settings: { ...question.settings, ...patch } });
  return (
    <div>
      <div className={ed.row}>
        {stars ? (
          <>
            <Select label="Anzahl Sterne" value={question.settings.max ?? 5} options={toOptions(maxChoices)} onChange={(max) => set({ max })} />
            Sterne
          </>
        ) : (
          <>
            Von
            <Select label="Von" value={question.settings.min ?? 1} options={toOptions([0, 1])} onChange={(min) => set({ min })} />
            bis
            <Select label="Bis" value={question.settings.max ?? 5} options={toOptions(maxChoices)} onChange={(max) => set({ max })} />
          </>
        )}
      </div>
      <div className={ed.labels}>
        {(["min", "max"] as const).map((side) => {
          const key = side === "min" ? "minLabel" : "maxLabel";
          return (
            <div key={side}>
              <label htmlFor={`${side}-${question.id}`}>Beschriftung {side === "min" ? "links" : "rechts"}</label>
              <input id={`${side}-${question.id}`} type="text" className={ed.input} value={question.settings[key] ?? ""} placeholder={COPY.scale[side]} onChange={(e) => set({ [key]: e.target.value || undefined })} />
            </div>
          );
        })}
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
  label: "Skala",
  hint: "Zahlen, z. B. 1 bis 5",
  defaultBoxTitle: "",
  apply: (q) => applyScale(q, "numbers"),
  Input: NumberInput,
  Editor: (p) => <ScaleEditor {...p} maxChoices={[3, 4, 5, 6, 7, 10]} />,
  resultOptions: scaleResultOptions,
  format: (_q, v) => (v == null ? "" : String(v)),
};

export const stars: QuestionTypeDef = {
  kind: "stars",
  label: "Sterne",
  hint: "Bewertung mit 3 bis 6 Sternen",
  defaultBoxTitle: "",
  apply: (q) => applyScale(q, "stars"),
  Input: StarInput,
  Editor: (p) => <ScaleEditor {...p} maxChoices={[3, 4, 5, 6]} stars />,
  resultOptions: (q) => scaleResultOptions(q).map((o) => ({ ...o, label: `${o.value}★`, short: `${o.value}★` })),
  format: (_q, v) => (v == null ? "" : `${v} ★`),
};
