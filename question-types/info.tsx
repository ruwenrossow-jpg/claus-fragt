import { commonSettings } from "./settings";
import { QuestionTypeDef } from "./types";

/**
 * Zwischenfolie („Binde-Slide“): nur eine Überschrift, die Claus sagt – keine Eingabe, keine Antwort, nicht in der Auswertung.
 * DB-Typ long_text + settings.display = "info" (keine Migration nötig).
 */
export const info: QuestionTypeDef = {
  kind: "info",
  label: "Zwischenfolie",
  hint: "Nur eine Überschrift, ohne Antwort – z. B. „Jetzt geht's ums Essen“",
  defaultBoxTitle: "",
  apply: (q) => {
    const { tafel: _tafel, ...settings } = commonSettings(q);
    return { ...q, type: "long_text", options: [], required: false, settings: { ...settings, display: "info" } };
  },
  Input: () => null,
  format: () => "",
};

export const isInfo = (q: { type: string; settings: { display?: string } }) => q.settings.display === "info";
