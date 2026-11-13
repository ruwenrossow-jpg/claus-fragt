import { ChoiceList } from "./ChoiceList";
import { OptionsEditor } from "./OptionsEditor";
import { letter } from "./letters";
import { QuestionTypeDef, ResultOption } from "./types";
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

export const multipleChoice: QuestionTypeDef = {
  kind: "multiple_choice",
  label: "Mehrfachauswahl",
  defaultBoxTitle: "Mehrere Antworten möglich:",
  apply: (q) => withOptions(q, "multiple_choice"),
  Input: ({ question, value, onChange }) => {
    const arr = Array.isArray(value) ? value : [];
    return (
      <ChoiceList
        square
        items={question.options.map((o, i) => ({ key: o, label: o || `Antwort ${letter(i)}` }))}
        isOn={(k) => arr.includes(k)}
        onToggle={(k) => onChange(arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k])}
      />
    );
  },
  Editor: OptionsEditor,
  resultOptions,
  matches: (v, o) => Array.isArray(v) && v.includes(String(o.value)),
  format: (_q, v) => (Array.isArray(v) ? v.join("; ") : ""),
};
