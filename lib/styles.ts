/**
 * Styles verändern NICHT das Gerüst, sondern: Stufen + Hilfetext im Ziel-Platz (Schritt 4),
 * den Ton (Theme: du/Sie, Emojis) und das Aussehen. Theme-Details: brand/themes.ts
 */
import { Ansprache } from "./types";

export type StyleId = "inspire" | "implement" | "network";

export interface StyleDef {
  id: StyleId;
  name: string;
  /** Ziel-Platz (Schritt 4) */
  zielHelp: string;
  zielBeispiel: Record<Ansprache, string>;
  zielLevels: string[];
}

export const STYLES: Record<StyleId, StyleDef> = {
  inspire: {
    id: "inspire",
    name: "Inspire",
    zielHelp: "Hat das Event Lust auf mehr gemacht?",
    zielBeispiel: { du: "Kannst du dir vorstellen, später so etwas zu machen?", Sie: "Können Sie sich vorstellen, später so etwas zu machen?" },
    zielLevels: ["Nein", "Vielleicht", "Eher ja", "Auf jeden Fall"],
  },
  implement: {
    id: "implement",
    name: "Implement",
    zielHelp: "Hilft das bei einer echten Entscheidung im Betrieb?",
    zielBeispiel: { du: "Hilft dir das bei einer konkreten Entscheidung?", Sie: "Hilft Ihnen das bei einer konkreten Entscheidung?" },
    zielLevels: ["Nein", "Noch nicht", "Ja, demnächst", "Ja, schon in Planung"],
  },
  network: {
    id: "network",
    name: "Network",
    zielHelp: "Gab es neues Wissen und neue Kontakte?",
    zielBeispiel: { du: "Was nimmst du mit?", Sie: "Was nehmen Sie mit?" },
    zielLevels: ["Nichts Neues", "Einen Impuls", "Neues Wissen", "Wissen und neue Kontakte"],
  },
};

export function getStyle(id: string | null | undefined): StyleDef {
  return STYLES[id as StyleId] ?? STYLES.inspire; // alte Bögen (style "claus") = Inspire
}

/** Event-Typ = eine Entscheidung beim Anlegen; daraus folgt die Vorauswahl. */
export interface EventType {
  id: string;
  name: string;
  style: StyleId;
  teach: boolean;
  menti: boolean;
  ansprache: Ansprache;
  /** Vorschlag für die Optionen im Platz „Zielgruppe“ */
  zielgruppen: string[];
}

export const EVENT_TYPES: EventType[] = [
  { id: "ausstellung", name: "Ausstellung / Familien", style: "inspire", teach: false, menti: false, ansprache: "du", zielgruppen: ["Kind / Jugendliche:r", "Elternteil", "Großeltern", "Andere"] },
  { id: "schule", name: "Schulklasse / Girls' Day", style: "inspire", teach: true, menti: true, ansprache: "du", zielgruppen: ["Schüler:in", "Lehrkraft", "Begleitung"] },
  { id: "lehrkraefte", name: "Workshop Lehrkräfte", style: "network", teach: true, menti: false, ansprache: "du", zielgruppen: ["Grundschule", "Sekundarstufe I", "Sek II / Berufsschule", "Andere"] },
  { id: "unternehmen", name: "Unternehmen / Watt-Format", style: "implement", teach: false, menti: false, ansprache: "Sie", zielgruppen: ["Geschäftsführung", "Technik", "Einkauf / Verwaltung", "Andere"] },
  { id: "symposium", name: "Symposium Partner / Stadtwerke", style: "implement", teach: true, menti: false, ansprache: "Sie", zielgruppen: ["Stadtwerk", "Kommune", "Forschung", "Andere"] },
  { id: "fachtagung", name: "Fachtagung", style: "network", teach: false, menti: false, ansprache: "Sie", zielgruppen: ["Wissenschaft", "Wirtschaft", "Verwaltung", "Andere"] },
  { id: "hackathon", name: "Hackathon / Studierende", style: "network", teach: false, menti: true, ansprache: "du", zielgruppen: ["Student:in", "Mentor:in", "Orga / Partner", "Andere"] },
  { id: "sonstiges", name: "Sonstiges", style: "network", teach: false, menti: false, ansprache: "du", zielgruppen: ["Teilnehmer:in", "Orga", "Andere"] },
];

export function getEventType(id: string | null | undefined): EventType {
  return EVENT_TYPES.find((e) => e.id === id) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}
