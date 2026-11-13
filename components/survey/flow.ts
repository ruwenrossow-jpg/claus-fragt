/** Ablauf eines Bogens als reine Daten – keine UI. Reihenfolge laut Prototyp: Start → Fragen → Ende → Ergebnisse → Fertig. */
export type Step =
  | { kind: "start" }
  | { kind: "question"; index: number }
  | { kind: "over" }
  | { kind: "result"; index: number }
  | { kind: "done" };

export const START: Step = { kind: "start" };

export function nextStep(step: Step, questionCount: number, resultCount: number): Step {
  switch (step.kind) {
    case "start":
      return questionCount ? { kind: "question", index: 0 } : { kind: "over" };
    case "question":
      return step.index + 1 < questionCount ? { kind: "question", index: step.index + 1 } : { kind: "over" };
    case "over":
      return resultCount ? { kind: "result", index: 0 } : { kind: "done" };
    case "result":
      return step.index + 1 < resultCount ? { kind: "result", index: step.index + 1 } : { kind: "done" };
    case "done":
      return step;
  }
}

/** null = kein „zurück“ auf diesem Screen. */
export function prevStep(step: Step, questionCount: number): Step | null {
  switch (step.kind) {
    case "question":
      return step.index === 0 ? START : { kind: "question", index: step.index - 1 };
    case "over":
      return questionCount ? { kind: "question", index: questionCount - 1 } : START;
    case "result":
      return step.index === 0 ? { kind: "over" } : { kind: "result", index: step.index - 1 };
    default:
      return null;
  }
}

/** Fortschrittsbalken: Fragen füllen ihn schrittweise, auf dem Ende-Screen ist er voll. */
export function progressOf(step: Step, questionCount: number): number | undefined {
  if (step.kind === "question") return (step.index + 1) / (questionCount + 1);
  if (step.kind === "over") return 1;
  return undefined;
}
