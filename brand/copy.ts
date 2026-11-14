/**
 * Alle Texte für Teilnehmende (Tonalität). Platzhalter: {event}, {thema}, {anzahl}.
 * du-Variante ist Standard; die Sie-Variante (nur ältere Bögen) überschreibt einzelne Texte. Emojis nur bei „Inspirierend“.
 *
 * Tonalitätsregeln (Forschung + Straßentest n = 11), Hinweise im Editor: lib/rules.ts
 * du statt Sie · kein Amtsdeutsch · Auftrag statt Frage · kurze Fragen, wenige Optionen ·
 * eine Sache pro Frage · Stufen beschreiben statt nummerieren · Ehrlichkeit einladen · Sinn zeigen ·
 * keine hypothetische Zukunft · Emojis nur bei „Inspirierend“ · Claus spricht in Ich-Form, freundlich, kurz.
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
  progress: { first: "Los geht's!", half: "Halbzeit!", last: "Letzte Frage!" },
  buttons: { next: "WEITER!", back: "Zurück", result: "Ergebnis ansehen", finish: "Fertig", retry: "Nochmal", busy: "Moment …" },
  hints: { optional: "Freiwillig", required: "Bitte beantworte diese Frage.", maxChoices: "Höchstens {max} Antworten" },
  end: { claus: "Schon vorbei? Danke dir!", title: "Deine Antworten sind gespeichert." },
  result: { title: "So haben alle geantwortet", mine: "Deine Antwort", question: "Frage {n}", answers: ["Antwort", "Antworten"] },
  thanks: { title: "Danke!", sub: "Wir lesen jede Antwort, versprochen." },
  closed: { title: "Diese Umfrage ist beendet.", sub: "Danke fürs Vorbeischauen!" },
  draft: { title: "Dieser Bogen ist noch nicht live.", sub: "Schau etwas später nochmal vorbei!" },
  gone: { title: "Diesen Bogen gibt es nicht mehr.", sub: "Vielleicht hat sich der Link geändert. Frag am besten dort nach, wo du ihn bekommen hast." },
  loading: "Einen Moment …",
  notFound: { title: "Hier ist nichts.", sub: "Diese Seite gibt es nicht. Prüf am besten nochmal den Link." },
  crash: { title: "Hoppla, da ist etwas schiefgelaufen.", sub: "Tipp auf „Nochmal“ – meistens klappt es dann." },
  errors: {
    save: "Speichern ging nicht. Prüf dein Internet und tipp nochmal.",
    results: "Die Ergebnisse kommen gerade nicht durch. Tipp nochmal!",
    offline: { title: "Ich komme gerade nicht durch.", sub: "Prüf kurz dein Internet und versuch es nochmal." },
  },
  placeholder: { text: "Ein Satz reicht …" },
  scale: { min: "sehr schlecht", max: "sehr gut" },
  /** nur für Screenreader */
  aria: { stars: ["Stern", "Sterne"], progress: "Fortschritt" },
};

export type Copy = typeof DU;

const SIE: Copy = {
  ...DU,
  start: { ...DU.start, claus: "Hallo, ich bin Claus! Helfen Sie mir kurz?", sub: "Mit Ihren Antworten machen wir {event} beim nächsten Mal besser." },
  hints: { ...DU.hints, required: "Bitte beantworten Sie diese Frage." },
  end: { claus: "Schon vorbei? Danke Ihnen!", title: "Ihre Antworten sind gespeichert." },
  result: { ...DU.result, mine: "Ihre Antwort" },
  thanks: { ...DU.thanks, sub: "Wir lesen jede Antwort, versprochen." },
  draft: { ...DU.draft, sub: "Schauen Sie etwas später nochmal vorbei!" },
  gone: { ...DU.gone, sub: "Vielleicht hat sich der Link geändert. Fragen Sie am besten dort nach, wo Sie ihn bekommen haben." },
  errors: {
    save: "Speichern ging nicht. Bitte Internet prüfen und nochmal tippen.",
    results: "Die Ergebnisse kommen gerade nicht durch. Bitte nochmal tippen!",
    offline: { title: "Ich komme gerade nicht durch.", sub: "Bitte prüfen Sie kurz Ihr Internet und versuchen Sie es nochmal." },
  },
};

function withEmoji(c: Copy): Copy {
  return {
    ...c,
    start: { ...c.start, claus: c.start.claus.replace("!", "! 👋") },
    progress: { ...c.progress, half: `${c.progress.half} 💪`, last: `${c.progress.last} 🏁` },
    thanks: { ...c.thanks, title: `${c.thanks.title} 🎉` },
  };
}

export function getCopy(ansprache: Ansprache, emoji: boolean): Copy {
  const base = ansprache === "Sie" ? SIE : DU;
  return emoji ? withEmoji(base) : base;
}

/** Standardtexte (du, ohne Emojis), z. B. für Platzhalter im Builder und Seiten ohne Bogen (404). */
export const COPY_DEFAULT = getCopy("du", false);

/** Einzahl/Mehrzahl: plural(1, ["Antwort", "Antworten"]) → „1 Antwort“. */
export const plural = (n: number, [one, many]: readonly string[]) => `${n} ${n === 1 ? one : many}`;
