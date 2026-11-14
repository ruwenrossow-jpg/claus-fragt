/**
 * Datenzugriff. Seiten und Komponenten sprechen NIE direkt mit Supabase, sondern nur über diese Funktionen.
 * Alle Funktionen werfen bei Fehlern einen Error mit lesbarer Meldung.
 */
import { supabase } from "./supabase";
import { Answer, AnswerValue, Form, FormSettings, Question, isEmptyAnswer } from "./types";

const PAGE = 1000;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error && /settings|public_slug/.test(res.error.message)) {
    throw new Error("Datenbank noch nicht aktuell: Bitte die Migration 20261114090000_framework.sql im Supabase SQL-Editor ausführen.");
  }
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Supabase liefert max. 1000 Zeilen pro Abfrage, daher seitenweise laden. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const data = unwrap(await build(from, from + PAGE - 1)) ?? [];
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

// ---------- Bögen ----------

export async function listForms(): Promise<Form[]> {
  return unwrap(await supabase.from("forms").select("*").order("updated_at", { ascending: false })) ?? [];
}

/** Kurzer, zufälliger Link-Teil, z. B. „k3x9qa“ (ohne verwechselbare Zeichen). */
export function newSlug(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => chars[b % chars.length]).join("");
}

export interface NewFormInput {
  title: string;
  description?: string | null;
  style: string;
  settings?: FormSettings;
  /** Fragen (z. B. beim Duplizieren); neue Bögen starten leer */
  questions?: (formId: string) => Question[];
}

/** Legt einen Bogen an (neue Bögen ohne Fragen). */
export async function createForm(input: NewFormInput): Promise<Form> {
  const form: Form = unwrap(
    await supabase
      .from("forms")
      .insert({ title: input.title, description: input.description ?? null, style: input.style, settings: input.settings ?? {}, public_slug: newSlug() })
      .select()
      .single()
  );
  const qs = (input.questions?.(form.id) ?? []).map((q, i) => ({ ...q, position: i }));
  if (qs.length) unwrap(await supabase.from("questions").insert(qs));
  return form;
}

/** Bogen als Vorlage kopieren: Fragen ja, Antworten nein. */
export async function duplicateForm(id: string): Promise<Form> {
  const { form, questions } = await loadForm(id);
  return createForm({
    title: `${form.title} (Kopie)`,
    description: form.description,
    style: form.style ?? "inspire",
    settings: form.settings ?? {},
    questions: (formId) => questions.map((q) => ({ ...q, id: crypto.randomUUID(), form_id: formId })),
  });
}

export async function deleteForm(id: string): Promise<void> {
  unwrap(await supabase.from("forms").delete().eq("id", id));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Öffentlicher Link: /f/<slug> (alte Links mit id funktionieren weiter). */
export async function loadPublicForm(slugOrId: string): Promise<{ form: Form; questions: Question[] }> {
  if (UUID.test(slugOrId)) return loadForm(slugOrId);
  const form: Form = unwrap(await supabase.from("forms").select("*").eq("public_slug", slugOrId).single());
  return loadForm(form.id);
}

export async function countResponses(formId: string): Promise<number> {
  const res = await supabase.from("responses").select("id", { count: "exact", head: true }).eq("form_id", formId);
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

export async function listResponseCounts(): Promise<Record<string, number>> {
  const rows = await fetchAll<{ form_id: string }>((a, b) => supabase.from("responses").select("form_id").range(a, b));
  return rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.form_id]: (acc[r.form_id] ?? 0) + 1 }), {});
}

export async function loadForm(id: string): Promise<{ form: Form; questions: Question[] }> {
  const [f, q] = await Promise.all([
    supabase.from("forms").select("*").eq("id", id).single(),
    supabase.from("questions").select("*").eq("form_id", id).order("position"),
  ]);
  return { form: unwrap(f) as Form, questions: (unwrap(q) as Question[]) ?? [] };
}

/** Speichert Bogen + Fragen in einem Rutsch (Reihenfolge = Array-Reihenfolge). Gibt den (ggf. neu vergebenen) öffentlichen Slug zurück. */
export async function saveForm(form: Form, questions: Question[], removedIds: string[]): Promise<string> {
  const slug = form.public_slug || newSlug();
  unwrap(
    await supabase
      .from("forms")
      .update({
        title: form.title,
        description: form.description,
        status: form.status,
        style: form.style,
        settings: form.settings ?? {},
        public_slug: slug,
      })
      .eq("id", form.id)
  );
  if (removedIds.length) unwrap(await supabase.from("questions").delete().in("id", removedIds));
  if (questions.length) {
    const rows = questions.map((q, i) => ({ ...q, position: i }));
    // defaultToNull: false → neue Fragen ohne created_at bekommen den DB-Standard statt null (gemischter Upsert mit geladenen Fragen)
    unwrap(await supabase.from("questions").upsert(rows, { defaultToNull: false }));
  }
  return slug;
}

// ---------- Antworten ----------

/**
 * Speichert einen ausgefüllten Bogen. Mit responseId werden die Antworten dieser Abgabe ersetzt
 * (z. B. wenn jemand nach dem Ende-Screen zurückgeht und etwas ändert). Gibt die response-id zurück.
 */
export async function saveResponse(formId: string, values: Record<string, AnswerValue>, responseId?: string): Promise<string> {
  const id = responseId ?? crypto.randomUUID();
  if (responseId) unwrap(await supabase.from("answers").delete().eq("response_id", id));
  else unwrap(await supabase.from("responses").insert({ id, form_id: formId }));
  const rows = Object.entries(values)
    .filter(([, v]) => !isEmptyAnswer(v))
    .map(([question_id, value]) => ({ response_id: id, question_id, value }));
  if (rows.length) unwrap(await supabase.from("answers").insert(rows));
  return id;
}

export async function loadResponses(formId: string): Promise<{ id: string; created_at: string }[]> {
  return fetchAll((a, b) =>
    supabase.from("responses").select("id, created_at").eq("form_id", formId).order("created_at").range(a, b)
  );
}

export async function loadAnswers(formId: string): Promise<Answer[]> {
  return fetchAll<Answer>((a, b) =>
    supabase
      .from("answers")
      .select("response_id, question_id, value, responses!inner(form_id)")
      .eq("responses.form_id", formId)
      .range(a, b)
  );
}
