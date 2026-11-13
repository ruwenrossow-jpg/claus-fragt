/**
 * Alle Texte für Teilnehmende (Tonalität). Platzhalter: {event}, {thema}, {anzahl}.
 * du-Variante ist Standard; die Sie-Variante überschreibt einzelne Texte. Emojis nur, wenn das Theme es will (Inspire).
 *
 * Tonalitätsregeln (Forschung + Straßentest n = 11) – auch als Tipp-Leiste im Editor (lib/tone.ts):
 * du statt Sie (außer Implement/Fachtagung) · kein Amtsdeutsch · Auftrag statt Frage · Fragen ≤ 10 Wörter, Optionen ≤ 4 ·
 * eine Sache pro Frage · Stufen beschreiben statt nummerieren · Ehrlichkeit einladen · Sinn zeigen ·
 * keine hypothetische Zukunft · Emojis nur bei Inspire · Claus spricht in Ich-Form, freundlich, kurz.
 */
import { Ansprache } from "@/lib/types";

const DU = {
  start: {
    claus: "Hi, ich bin Claus! Hilfst du mir kurz?",
    title: "Ehrlich jetzt: Wie war's?",
    sub: "Mit deinen Antworten machen wir {event} beim nächsten Mal besser.",
    chips: ["{anzahl} kurze Fragen", "anonym", "Ergebnis gleich danach"],
    button: "Los geht's",
  },
  steps: { 1: "Kurz zu dir:", 2: "Wie fandest du's?", 3: "Was nimmst du mit?", 4: "Und was machst du jetzt damit?", 5: "Letzte Runde!" } as Record<number, string>,
  progress: { half: "Halbzeit!", last: "Letzte Frage!" },
  buttons: { next: "WEITER!", back: "Zurück", skip: "Überspringen", result: "Ergebnis ansehen", finish: "Fertig" },
  hints: { honest: "Auch „nichts“ ist eine gute Antwort.", optional: "Freiwillig", required: "Bitte beantworte diese Frage.", maxChoices: "Höchstens {max} Antworten" },
  end: { claus: "Schon vorbei? Danke dir!", title: "Deine Antworten sind gespeichert." },
  result: { title: "So haben die anderen geantwortet", mine: "Deine Antwort" },
  thanks: { title: "Danke!", sub: "Wir lesen jede Antwort, versprochen." },
  closed: { title: "Diese Umfrage ist beendet.", sub: "Danke fürs Vorbeischauen!" },
  placeholder: { text: "Ein Satz reicht …" },
  scale: { min: "sehr schlecht", max: "sehr gut" },
};

export type Copy = typeof DU;

const SIE: Copy = {
  ...DU,
  start: { ...DU.start, claus: "Hallo, ich bin Claus! Helfen Sie mir kurz?", sub: "Mit Ihren Antworten machen wir {event} beim nächsten Mal besser." },
  steps: { 1: "Kurz zu Ihnen:", 2: "Wie fanden Sie es?", 3: "Was nehmen Sie mit?", 4: "Und was machen Sie jetzt damit?", 5: "Letzte Runde!" },
  hints: { ...DU.hints, required: "Bitte beantworten Sie diese Frage." },
  end: { claus: "Schon vorbei? Danke Ihnen!", title: "Ihre Antworten sind gespeichert." },
  result: { ...DU.result, mine: "Ihre Antwort" },
  thanks: { ...DU.thanks, sub: "Wir lesen jede Antwort, versprochen." },
};

function withEmoji(c: Copy): Copy {
  return {
    ...c,
    start: { ...c.start, claus: c.start.claus.replace("!", "! 👋") },
    progress: { half: `${c.progress.half} 💪`, last: `${c.progress.last} 🏁` },
    thanks: { ...c.thanks, title: `${c.thanks.title} 🎉` },
  };
}

export function getCopy(ansprache: Ansprache, emoji: boolean): Copy {
  const base = ansprache === "Sie" ? SIE : DU;
  return emoji ? withEmoji(base) : base;
}

/** Standard-Überschriften der Antwort-Box sind leer – die Frage steht in der Sprechblase. */
export const COPY_DEFAULT = getCopy("du", false);
