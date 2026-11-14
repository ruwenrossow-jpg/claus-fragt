/**
 * Ablauf eines Bogens als reine Daten – keine UI. Reihenfolge laut Prototyp: Start → Fragen → Ende → Ergebnisse → Fertig → Tschüss.
 * Läuft eine Tafel (Menti-Modus), kommt nach dem Start der gemeinsame Teil („tafel“), danach die übrigen Fragen.
 */
export type Step =
  | { kind: "start" }
  | { kind: "tafel" }
  | { kind: "question"; index: number }
  | { kind: "over" }
  | { kind: "result"; index: number }
  | { kind: "done" }
  | { kind: "bye" };

export const START: Step = { kind: "start" };

export function nextStep(step: Step, questionCount: number, resultCount: number): Step {
  switch (step.kind) {
    case "start":
    case "tafel":
      return questionCount ? { kind: "question", index: 0 } : { kind: "over" };
    case "question":
      return step.index + 1 < questionCount ? { kind: "question", index: step.index + 1 } : { kind: "over" };
    case "over":
      return resultCount ? { kind: "result", index: 0 } : { kind: "done" };
    case "result":
      return step.index + 1 < resultCount ? { kind: "result", index: step.index + 1 } : { kind: "done" };
    case "done":
      return { kind: "bye" };
    case "bye":
      return step;
  }
}

/**
 * null = kein „zurück“ (Start und der gemeinsame Tafel-Teil, den die Moderation steuert).
 * Ab der ersten Frage geht es überall zurück, auch von Ende, Ergebnis, Fertig und Tschüss.
 * viaTafel: der Bogen lief über die Tafel → vor der ersten eigenen Frage liegt der Tafel-Screen.
 */
export function prevStep(step: Step, questionCount: number, resultCount = 0, viaTafel = false): Step | null {
  const before: Step = viaTafel ? { kind: "tafel" } : START;
  switch (step.kind) {
    case "question":
      return step.index === 0 ? before : { kind: "question", index: step.index - 1 };
    case "over":
      return questionCount ? { kind: "question", index: questionCount - 1 } : before;
    case "result":
      return step.index === 0 ? { kind: "over" } : { kind: "result", index: step.index - 1 };
    case "done":
      return resultCount ? { kind: "result", index: resultCount - 1 } : { kind: "over" };
    case "bye":
      return { kind: "done" };
    default:
      return null;
  }
}

/** Fortschritt in %: Anteil der schon beantworteten Fragen; auf dem Ende-Screen 100 %. */
export function progressOf(step: Step, questionCount: number): number | undefined {
  if (step.kind === "question") return questionCount ? step.index / questionCount : 0;
  if (step.kind === "over") return 1;
  return undefined;
}
