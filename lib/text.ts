import { Form } from "./types";

/** Ersetzt {event}, {thema}, {anzahl} – mit lesbaren Ersatztexten, falls leer. */
export function fillVars(text: string, form: Pick<Form, "settings" | "title">, extra: Record<string, string | number> = {}): string {
  const vars: Record<string, string | number> = {
    event: form.settings?.eventName || form.title || "das Event",
    thema: form.settings?.thema || "dem Thema",
    ...extra,
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
