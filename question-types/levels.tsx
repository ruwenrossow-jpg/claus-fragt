import { ChoiceList } from "./ChoiceList";
import { OptionsEditor } from "./OptionsEditor";
import { commonSettings } from "./settings";
import { QuestionTypeDef } from "./types";
import { Question } from "@/lib/types";

const DEFAULT_LEVELS = ["Gar nicht", "Ein bisschen", "Ziemlich", "Voll und ganz"];

/** Score einer Stufe = Position (1–4). Grundlage der KPIs. */
export function levelScore(q: Question, value: unknown): number | null {
  const i = q.options.indexOf(String(value));
  return i < 0 ? null : i + 1;
}

/** Signalbalken rechts neben der Stufe (wie im Prototyp): je höher die Stufe, desto mehr Balken gefüllt. */
function LevelIcon({ level, of }: { level: number; of: number }) {
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" aria-hidden style={{ marginLeft: "auto", flex: "none" }}>
      {Array.from({ length: of }, (_, i) => {
        const h = 6 + (i * 16) / Math.max(1, of - 1);
        return <rect key={i} x={i * 7} y={22 - h} width="5" height={h} rx="1.5" fill={i < level ? "var(--survey-accent)" : "var(--survey-neutral)"} stroke="var(--survey-ink)" strokeWidth="0.6" />;
      })}
    </svg>
  );
}

export const levels: QuestionTypeDef = {
  kind: "levels",
  autoAdvance: true,
  label: "Stufen (4)",
  defaultBoxTitle: "",
  apply: (q: Question) => ({
    ...q,
    type: "single_choice",
    options: q.options.length === 4 ? q.options : DEFAULT_LEVELS,
    settings: { ...commonSettings(q), display: "levels" },
  }),
  Input: ({ question, value, onChange }) => (
    <ChoiceList
      items={question.options.map((o, i) => ({ key: o, label: o, suffix: <LevelIcon level={i + 1} of={question.options.length} /> }))}
      isOn={(k) => value === k}
      onToggle={(k) => onChange(k)}
    />
  ),
  Editor: OptionsEditor,
  resultOptions: (q) => q.options.map((o, i) => ({ value: o, label: o, short: String(i + 1) })),
  format: (_q, v) => (v == null ? "" : String(v)),
};
