/**
 * Datenzugriff. Seiten und Komponenten sprechen NIE direkt mit Supabase, sondern nur über diese Funktionen.
 * Alle Funktionen werfen bei Fehlern einen Error mit lesbarer Meldung.
 */
import { supabase } from "./supabase";
import { Answer, AnswerValue, Form, Question, isEmptyAnswer } from "./types";

const PAGE = 1000;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
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

export async function createForm(title = "Neuer Evaluationsbogen"): Promise<Form> {
  return unwrap(await supabase.from("forms").insert({ title, style: "claus" }).select().single());
}

export async function deleteForm(id: string): Promise<void> {
  unwrap(await supabase.from("forms").delete().eq("id", id));
}

export async function loadForm(id: string): Promise<{ form: Form; questions: Question[] }> {
  const [f, q] = await Promise.all([
    supabase.from("forms").select("*").eq("id", id).single(),
    supabase.from("questions").select("*").eq("form_id", id).order("position"),
  ]);
  return { form: unwrap(f) as Form, questions: (unwrap(q) as Question[]) ?? [] };
}

/** Speichert Bogen + Fragen in einem Rutsch (Reihenfolge = Array-Reihenfolge). */
export async function saveForm(form: Form, questions: Question[], removedIds: string[]): Promise<void> {
  unwrap(
    await supabase
      .from("forms")
      .update({ title: form.title, description: form.description, status: form.status, style: form.style })
      .eq("id", form.id)
  );
  if (removedIds.length) unwrap(await supabase.from("questions").delete().in("id", removedIds));
  if (questions.length) {
    const rows = questions.map((q, i) => ({ ...q, position: i }));
    unwrap(await supabase.from("questions").upsert(rows));
  }
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
