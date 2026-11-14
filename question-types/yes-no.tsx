import { ChoiceList } from "./ChoiceList";
import { commonSettings } from "./settings";
import { QuestionTypeDef } from "./types";

const ITEMS = [
  { key: "yes", label: "Ja", value: true },
  { key: "no", label: "Nein", value: false },
];

export const yesNo: QuestionTypeDef = {
  kind: "yes_no",
  label: "Ja / Nein",
  hint: "Zwei feste Antworten",
  defaultBoxTitle: "",
  apply: (q) => ({ ...q, type: "yes_no", options: [], settings: commonSettings(q) }),
  Input: ({ value, onChange }) => (
    <ChoiceList items={ITEMS} isOn={(k) => ITEMS.find((i) => i.key === k)?.value === value} onToggle={(k) => onChange(ITEMS.find((i) => i.key === k)!.value)} />
  ),
  resultOptions: () => [
    { value: true, label: "Ja", short: "Ja" },
    { value: false, label: "Nein", short: "Nein" },
  ],
  format: (_q, v) => (v === true ? "Ja" : v === false ? "Nein" : ""),
};
