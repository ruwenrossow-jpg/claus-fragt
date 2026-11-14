/**
 * Ablauf-Idee (Framework als stille Begleitung): 5 Bereiche in empfohlener Reihenfolge, je mit typischer Frageart
 * und Vorschlägen. Nichts ist Pflicht – ein Klick auf einen Vorschlag legt die Frage an (questions.step = Bereich).
 * Inhalte sind ein erster Stand aus Builder v1; Ruwens finale 5 Bereiche + KPI ersetzen sie hier.
 */
import { getTheme } from "@/brand/themes";
import { QuestionKind } from "@/question-types/types";

export interface Vorschlag {
  label: string;
  kind: QuestionKind;
  options?: string[];
  maxChoices?: number;
  kpi?: "transfer" | "ziel" | "teach";
}

export interface Bereich {
  step: number;
  name: string;
  /** typische Frageart dieses Bereichs (steht im Feld) */
  kind: QuestionKind;
  /** ein Satz: warum dieser Bereich zählt */
  warum: string;
  vorschlaege: Vorschlag[];
}

const TRANSFER = ["Nichts", "Grober Eindruck", "Konkrete Idee", "Direkt anwendbar"];
const TEACH = ["Nein", "Vielleicht", "Ja, an Einzelne", "Ja, an eine ganze Gruppe"];

export function bereicheFor(style: string | null): Bereich[] {
  const lernend = getTheme(style).id === "network";
  return [
    {
      step: 1, name: "Wer?", kind: "single_choice",
      warum: "Damit du die Antworten später nach Gruppen lesen kannst.",
      vorschlaege: [
        { label: "Wer bist du heute?", kind: "single_choice", options: lernend ? ["Fachkraft", "Führungskraft", "Studierende:r", "Sonstiges"] : ["Schüler:in", "Studierende:r", "Berufstätig", "Sonstiges"] },
        { label: "Wie hast du von uns erfahren?", kind: "single_choice", options: ["Freund:innen", "Schule / Uni / Arbeit", "Social Media", "Sonstiges"] },
        { label: "Warst du schon mal bei uns?", kind: "yes_no" },
      ],
    },
    {
      step: 2, name: "Wie war's?", kind: "stars",
      warum: "Der Gesamteindruck – schnell beantwortet und gut vergleichbar.",
      vorschlaege: [
        { label: "Ehrlich jetzt: Wie war's?", kind: "stars" },
        { label: "Was war dein Highlight?", kind: "short_text" },
        { label: lernend ? "Wie verständlich war es für dich?" : "Wie war die Stimmung?", kind: "scale" },
      ],
    },
    {
      step: 3, name: "Was bleibt?", kind: "levels",
      warum: "Zeigt, ob der Inhalt wirklich angekommen ist (Transfer).",
      vorschlaege: [
        { label: "Was ist bei dir hängen geblieben?", kind: "levels", options: TRANSFER, kpi: "transfer" },
        { label: "Ein Stichwort, das hängen bleibt?", kind: "short_text" },
        { label: lernend ? "Was war neu für dich?" : "Was hat dich überrascht?", kind: "short_text" },
      ],
    },
    {
      step: 4, name: "Was ändert sich?", kind: "levels",
      warum: lernend ? "Wird das Gelernte angewendet? Das ist das eigentliche Ziel." : "Hat das Event Lust auf mehr gemacht? Das ist das eigentliche Ziel.",
      vorschlaege: lernend
        ? [
            { label: "Hilft dir das bei einer konkreten Entscheidung?", kind: "levels", options: ["Nein", "Eher nicht", "Ein Stück weit", "Ja, ganz konkret"], kpi: "ziel" },
            { label: "Was setzt du nächste Woche um?", kind: "short_text" },
            { label: "Erzählst du davon weiter?", kind: "levels", options: TEACH, kpi: "teach" },
          ]
        : [
            { label: "Kannst du dir vorstellen, später so etwas zu machen?", kind: "levels", options: ["Nein", "Eher nicht", "Vielleicht", "Auf jeden Fall"], kpi: "ziel" },
            { label: "Erzählst du davon weiter?", kind: "levels", options: TEACH, kpi: "teach" },
            { label: "Was willst du als Nächstes ausprobieren?", kind: "short_text" },
          ],
    },
    {
      step: 5, name: "Wie weiter?", kind: "yes_no",
      warum: "Wiederkommen und Verbessern – damit das nächste Mal noch besser wird.",
      vorschlaege: [
        { label: "Würdest du wiederkommen?", kind: "yes_no" },
        { label: "Was hätte es noch besser gemacht?", kind: "multiple_choice", options: ["Mehr Zeit", "Mehr Praxis", "Mehr Pausen", "Bessere Infos vorab"], maxChoices: 2 },
        { label: "Ein Satz an uns?", kind: "long_text" },
      ],
    },
  ];
}
