import { Question, QuestionSettings } from "@/lib/types";

/** Einstellungen, die jeder Fragetyp beim Typwechsel behält. Typ-spezifische Felder setzt apply() neu. */
export function commonSettings(q: Question): QuestionSettings {
  const { boxTitle, mascotSide } = q.settings;
  return { ...(boxTitle !== undefined && { boxTitle }), ...(mascotSide && { mascotSide }) };
}
