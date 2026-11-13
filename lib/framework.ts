/**
 * Platzhalter für das 5-Schritt-Frage-Framework.
 * Namen, Beschreibungen und Regeln (Tonalität, empfohlene Fragetypen …)
 * werden hier eingesetzt, sobald das Framework steht. Der Rest der App
 * liest nur aus dieser Datei.
 */
export interface FrameworkStep {
  step: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
}

export const FRAMEWORK_STEPS: FrameworkStep[] = [
  { step: 1, name: "Schritt 1", description: "" },
  { step: 2, name: "Schritt 2", description: "" },
  { step: 3, name: "Schritt 3", description: "" },
  { step: 4, name: "Schritt 4", description: "" },
  { step: 5, name: "Schritt 5", description: "" },
];

export function stepName(step: number | null): string {
  if (step == null) return "Ohne Schritt";
  return FRAMEWORK_STEPS.find((s) => s.step === step)?.name ?? `Schritt ${step}`;
}
