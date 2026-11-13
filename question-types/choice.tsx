import { ChoiceList } from "./ChoiceList";
import { OptionsEditor } from "./OptionsEditor";
import { letter } from "./letters";
import { EditorProps, QuestionTypeDef, ResultOption } from "./types";
import ed from "./editors.module.css";
import { Question } from "@/lib/types";
import { commonSettings } from "./settings";

const DEFAULT_OPTIONS = ["Antwort A", "Antwort B", "Antwort C"];

function withOptions(q: Question, type: Question["type"]): Question {
  return { ...q, type, settings: commonSettings(q), options: q.options.length ? q.options : DEFAULT_OPTIONS };
}

function resultOptions(q: Question): ResultOption[] {
  return q.options.map((o, i) => ({ value: o, label: o, short: letter(i) }));
}

export const singleChoice: QuestionTypeDef = {
  kind: "single_choice",
  autoAdvance: true,
  label: "Multiple Choice (eine Antwort)",
  defaultBoxTitle: "",
  apply: (q) => withOptions(q, "single_choice"),
  Input: ({ question, value, onChange }) => (
    <ChoiceList
      items={question.options.map((o, i) => ({ key: o, label: o || `Antwort ${letter(i)}` }))}
      isOn={(k) => value === k}
      onToggle={(k) => onChange(k)}
    />
  ),
  Editor: OptionsEditor,
  resultOptions,
  format: (_q, v) => (v == null ? "" : String(v)),
};

function MaxChoicesEditor({ question, onChange }: EditorProps) {
  return (
    <>
      <OptionsEditor question={question} onChange={onChange} />
      <label className={ed.row}>
        Höchstens
        <select value={question.settings.maxChoices ?? 0} onChange={(e) => onChange({ settings: { ...question.settings, maxChoices: Number(e.target.value) || undefined } })}>
          <option value={0}>beliebig viele</option>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        Antworten
      </label>
    </>
  );
}

export const multipleChoice: QuestionTypeDef = {
  kind: "multiple_choice",
  autoAdvance: false,
  label: "Mehrfachauswahl",
  defaultBoxTitle: "",
  apply: (q) => {
    const next = withOptions(q, "multiple_choice");
    return q.settings.maxChoices ? { ...next, settings: { ...next.settings, maxChoices: q.settings.maxChoices } } : next;
  },
  Input: ({ question, value, onChange }) => {
    const arr = Array.isArray(value) ? value : [];
    const max = question.settings.maxChoices;
    return (
      <ChoiceList
        square
        items={question.options.map((o, i) => ({ key: o, label: o || `Antwort ${letter(i)}` }))}
        isOn={(k) => arr.includes(k)}
        onToggle={(k) => {
          if (arr.includes(k)) return onChange(arr.filter((x) => x !== k));
          // bei erreichtem Maximum ersetzt die neue Auswahl die älteste
          onChange(max && arr.length >= max ? [...arr.slice(arr.length - max + 1), k] : [...arr, k]);
        }}
      />
    );
  },
  Editor: MaxChoicesEditor,
  resultOptions,
  matches: (v, o) => Array.isArray(v) && v.includes(String(o.value)),
  format: (_q, v) => (Array.isArray(v) ? v.join("; ") : ""),
};
