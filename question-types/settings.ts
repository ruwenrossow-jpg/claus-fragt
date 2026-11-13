import { Question, QuestionSettings } from "@/lib/types";

/** Einstellungen, die jeder Fragetyp beim Typwechsel behält (Platz/KPI-Zuordnung, Box-Titel, Claus-Seite). */
export function commonSettings(q: Question): QuestionSettings {
  const { boxTitle, mascotSide, slotId, kpi } = q.settings;
  return {
    ...(boxTitle !== undefined && { boxTitle }),
    ...(mascotSide && { mascotSide }),
    ...(slotId && { slotId }),
    ...(kpi && { kpi }),
  };
}
