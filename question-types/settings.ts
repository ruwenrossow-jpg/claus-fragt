import { Question, QuestionSettings } from "@/lib/types";

/** Einstellungen, die jeder Fragetyp beim Typwechsel behält (Framework-Zuordnung, Box-Titel aus v1). */
export function commonSettings(q: Question): QuestionSettings {
  const { boxTitle, slotId, kpi, tafel } = q.settings;
  return {
    ...(boxTitle !== undefined && { boxTitle }),
    ...(slotId && { slotId }),
    ...(kpi && { kpi }),
    ...(tafel && { tafel }),
  };
}
