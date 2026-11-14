import { Select } from "@/components/admin/Select";
import { ChoiceList } from "./ChoiceList";
import { OptionsEditor } from "./OptionsEditor";
import { letter } from "./letters";
import { EditorProps, QuestionTypeDef, ResultOption } from "./types";
import ed from "./editors.module.css";
import { Question } from "@/lib/types";
import { commonSettings } from "./settings";

/** Neue Auswahlfrage: zwei leere Antworten (Platzhalter „Antwort A/B“). */
const DEFAULT_OPTIONS = ["", ""];

function withOptions(q: Question, type: Question["type"]): Question {
  return { ...q, type, settings: commonSettings(q), options: q.options.length ? q.options : DEFAULT_OPTIONS };
}

/** Leere Antworten (noch nicht ausgefüllt) erscheinen nicht im Bogen; doppelte nur einmal (gespeichert wird der Text). */
const filled = (q: Question) => [...new Set(q.options.filter((o) => o.trim()))];

function resultOptions(q: Question): ResultOption[] {
  return filled(q).map((o, i) => ({ value: o, label: o, short: letter(i) }));
}

export const singleChoice: QuestionTypeDef = {
  kind: "single_choice",
  label: "Auswahl",
  hint: "Eine Antwort aus einer Liste",
  defaultBoxTitle: "",
  apply: (q) => withOptions(q, "single_choice"),
  Input: ({ question, label, value, onChange }) => (
    <ChoiceList
      label={label}
      items={filled(question).map((o) => ({ key: o, label: o }))}
      isOn={(k) => value === k}
      onToggle={(k) => onChange(k)}
    />
  ),
  Editor: (p) => <OptionsEditor {...p} marker="radio" />,
  resultOptions,
  format: (_q, v) => (v == null ? "" : String(v)),
};

const MAX_OPTIONS = [{ value: 0, label: "beliebig" }, ...[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))];

function MaxChoicesEditor({ question, onChange }: EditorProps) {
  return (
    <>
      <OptionsEditor question={question} onChange={onChange} marker="check" />
      <div className={ed.row}>
        Höchstens
        <Select label="Höchstens so viele Antworten" value={question.settings.maxChoices ?? 0} options={MAX_OPTIONS} onChange={(n) => onChange({ settings: { ...question.settings, maxChoices: n || undefined } })} />
        Antworten
      </div>
    </>
  );
}

export const multipleChoice: QuestionTypeDef = {
  kind: "multiple_choice",
  label: "Mehrfachauswahl",
  hint: "Mehrere Antworten möglich",
  defaultBoxTitle: "",
  apply: (q) => {
    const next = withOptions(q, "multiple_choice");
    return q.settings.maxChoices ? { ...next, settings: { ...next.settings, maxChoices: q.settings.maxChoices } } : next;
  },
  Input: ({ question, label, value, onChange }) => {
    const arr = Array.isArray(value) ? value : [];
    const max = question.settings.maxChoices;
    return (
      <ChoiceList
        square
        label={label}
        items={filled(question).map((o) => ({ key: o, label: o }))}
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
