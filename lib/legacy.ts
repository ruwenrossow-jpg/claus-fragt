/**
 * Kompatibilität mit Bögen aus Builder v1 (Framework-Plätze). Dort konnten Pflicht-Plätze ohne eigenen Text
 * bleiben; im Bogen erschien dann ein Beispieltext. Neue Bögen nutzen das nicht.
 */
import { Ansprache, Form, Question } from "./types";

const both = (t: string) => ({ du: t, Sie: t });

const EXAMPLES: Record<string, Record<Ansprache, string>> = {
  zielgruppe: { du: "Wer bist du heute?", Sie: "Wer sind Sie heute?" },
  gesamteindruck: both("Ehrlich jetzt: Wie war's?"),
  transfer: { du: "Was ist bei dir zu {thema} hängen geblieben?", Sie: "Was ist bei Ihnen zu {thema} hängen geblieben?" },
  weitertragen: { du: "Erzählst du davon weiter?", Sie: "Erzählen Sie davon weiter?" },
};

const ZIEL: Record<string, Record<Ansprache, string>> = {
  inspire: { du: "Kannst du dir vorstellen, später so etwas zu machen?", Sie: "Können Sie sich vorstellen, später so etwas zu machen?" },
  implement: { du: "Hilft dir das bei einer konkreten Entscheidung?", Sie: "Hilft Ihnen das bei einer konkreten Entscheidung?" },
  network: { du: "Was nimmst du mit?", Sie: "Was nehmen Sie mit?" },
};

/** Beispieltext eines leeren v1-Pflichtplatzes (noch mit {event}/{thema}), sonst "". */
export function legacyLabel(q: Question, form: Pick<Form, "style">, ansprache: Ansprache): string {
  const slot = q.settings.slotId;
  if (!slot || !q.required || q.label.trim()) return "";
  const set = slot === "ziel" ? (ZIEL[form.style ?? ""] ?? ZIEL.inspire) : EXAMPLES[slot];
  return set?.[ansprache] ?? "";
}
