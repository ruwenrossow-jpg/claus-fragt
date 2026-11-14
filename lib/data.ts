/**
 * Datenzugriff. Seiten und Komponenten sprechen NIE direkt mit Supabase, sondern nur über diese Funktionen.
 * Alle Funktionen werfen bei Fehlern einen DataError mit lesbarer Meldung (deutsch, ohne Technik-Kauderwelsch).
 *
 * Harte Regel: In der App wird kein Bogen hart gelöscht. „Löschen“ = Papierkorb (settings.geloescht), siehe trashForm.
 */
import { supabase } from "./supabase";
import { Answer, AnswerValue, Form, FormSettings, Question, isEmptyAnswer } from "./types";

const PAGE = 1000;

export type DataErrorKind = "not_found" | "offline" | "other";

/** Fehler aus der Datenschicht; `kind` erlaubt passende Screens (nicht gefunden / keine Verbindung). */
export class DataError extends Error {
  constructor(message: string, readonly kind: DataErrorKind = "other") {
    super(message);
    this.name = "DataError";
  }
}

export const NOT_FOUND = "Diesen Bogen gibt es nicht (mehr).";
const OFFLINE = "Keine Verbindung zur Datenbank. Bitte prüf das Internet und versuch es nochmal.";

type Res<T> = { data: T | null; error: { message: string; code?: string } | null };

function toError(error: { message: string; code?: string }): DataError {
  const msg = error.message ?? "";
  if (/settings|public_slug/.test(msg) && /column|does not exist/i.test(msg)) {
    return new DataError("Datenbank noch nicht aktuell: Bitte die Migration 20261114090000_framework.sql im Supabase SQL-Editor ausführen.");
  }
  if (/fetch|network|load failed|timeout/i.test(msg)) return new DataError(OFFLINE, "offline");
  return new DataError(`Das hat nicht geklappt (${msg}). Bitte nochmal versuchen.`);
}

function unwrap<T>(res: Res<T>): T {
  if (res.error) throw toError(res.error);
  return res.data as T;
}

/** Wie unwrap, aber „keine Zeile“ = nicht gefunden. */
function unwrapOne<T>(res: Res<T>): T {
  const data = unwrap(res);
  if (data === null || data === undefined) throw new DataError(NOT_FOUND, "not_found");
  return data;
}

/** Supabase liefert max. 1000 Zeilen pro Abfrage, daher seitenweise laden. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<Res<T[]>>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const data = unwrap(await build(from, from + PAGE - 1)) ?? [];
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Unbekannte/kaputte ids gar nicht erst abfragen (Postgres meldet sonst „invalid input syntax for type uuid“). */
function assertId(id: string) {
  if (!UUID.test(id)) throw new DataError(NOT_FOUND, "not_found");
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

/** Bogen als Vorlage kopieren: Fragen ja, Antworten nein. Die Kopie startet als Entwurf (nie im Papierkorb). */
export async function duplicateForm(id: string): Promise<Form> {
  const { form, questions } = await loadForm(id);
  const { geloescht: _trash, ...settings } = form.settings ?? {};
  return createForm({
    title: `${form.title} (Kopie)`,
    description: form.description,
    style: form.style ?? "inspire",
    settings,
    questions: (formId) => questions.map((q) => ({ ...q, id: crypto.randomUUID(), form_id: formId })),
  });
}

/** Bögen von vor dem Login dem angemeldeten Konto zuordnen (nur solche ohne Besitzer:in). */
export async function claimForms(ids: string[], ownerId: string): Promise<void> {
  ids.forEach(assertId);
  if (!ids.length) return;
  unwrap(await supabase.from("forms").update({ owner_id: ownerId }).in("id", ids).is("owner_id", null));
}

/** Liest die aktuellen settings frisch aus der DB und ergänzt sie (nichts anderes wird überschrieben). */
async function patchSettings(id: string, patch: Partial<FormSettings>): Promise<void> {
  assertId(id);
  const row = unwrapOne<{ settings: FormSettings | null }>(await supabase.from("forms").select("settings").eq("id", id).maybeSingle());
  unwrap(await supabase.from("forms").update({ settings: { ...(row.settings ?? {}), ...patch } }).eq("id", id));
}

/** „Löschen“ in der App = Papierkorb (Soft-Delete). Fragen und Antworten bleiben vollständig erhalten. */
export async function trashForm(id: string): Promise<void> {
  await patchSettings(id, { geloescht: new Date().toISOString() });
}

/** Aus dem Papierkorb zurückholen. */
export async function restoreForm(id: string): Promise<void> {
  await patchSettings(id, { geloescht: null });
}

/** Öffentlicher Link: /f/<slug> (alte Links mit id funktionieren weiter). Gelöschte Bögen prüft die Seite (isTrashed). */
export async function loadPublicForm(slugOrId: string): Promise<{ form: Form; questions: Question[] }> {
  if (UUID.test(slugOrId)) return loadForm(slugOrId);
  if (!/^[a-z0-9-]{1,64}$/i.test(slugOrId)) throw new DataError(NOT_FOUND, "not_found");
  const form = unwrapOne<Form>(await supabase.from("forms").select("*").eq("public_slug", slugOrId).maybeSingle());
  return loadForm(form.id);
}

export async function countResponses(formId: string): Promise<number> {
  assertId(formId);
  const res = await supabase.from("responses").select("id", { count: "exact", head: true }).eq("form_id", formId);
  if (res.error) throw toError(res.error);
  return res.count ?? 0;
}

export async function listResponseCounts(): Promise<Record<string, number>> {
  const rows = await fetchAll<{ form_id: string }>((a, b) => supabase.from("responses").select("form_id").range(a, b));
  return rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.form_id]: (acc[r.form_id] ?? 0) + 1 }), {});
}

export async function loadForm(id: string): Promise<{ form: Form; questions: Question[] }> {
  assertId(id);
  const [f, q] = await Promise.all([
    supabase.from("forms").select("*").eq("id", id).maybeSingle(),
    supabase.from("questions").select("*").eq("form_id", id).order("position"),
  ]);
  return { form: unwrapOne<Form>(f), questions: unwrap<Question[]>(q) ?? [] };
}

/** Speichert Bogen + Fragen in einem Rutsch (Reihenfolge = Array-Reihenfolge). Gibt den (ggf. neu vergebenen) öffentlichen Slug zurück. */
export async function saveForm(form: Form, questions: Question[], removedIds: string[]): Promise<string> {
  assertId(form.id);
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

/** Neue id für eine Abgabe. Die Seite erzeugt sie EINMAL und gibt sie bei jedem Speichern mit. */
export const newResponseId = (): string => crypto.randomUUID();

/**
 * Speichert einen ausgefüllten Bogen unter der festen `responseId`. Idempotent: Mehrfaches Speichern derselben Abgabe
 * (Doppelklick, erneut versuchen nach Fehler, zurückgehen und ändern) ersetzt die Antworten und erzeugt nie eine zweite Abgabe.
 */
export async function saveResponse(formId: string, values: Record<string, AnswerValue>, responseId: string): Promise<void> {
  assertId(formId);
  unwrap(await supabase.from("responses").upsert({ id: responseId, form_id: formId }, { onConflict: "id", ignoreDuplicates: true }));
  unwrap(await supabase.from("answers").delete().eq("response_id", responseId));
  const rows = Object.entries(values)
    .filter(([, v]) => !isEmptyAnswer(v))
    .map(([question_id, value]) => ({ response_id: responseId, question_id, value }));
  if (rows.length) unwrap(await supabase.from("answers").insert(rows));
}

export async function loadResponses(formId: string): Promise<{ id: string; created_at: string }[]> {
  assertId(formId);
  return fetchAll((a, b) =>
    supabase.from("responses").select("id, created_at").eq("form_id", formId).order("created_at").range(a, b)
  );
}

/**
 * Antworten eines Bogens. Mit `questionIds` nur die Antworten dieser Fragen – der öffentliche Link lädt so nur
 * die auswertbaren Fragen (Ergebnis-Screens), keine Freitexte anderer Teilnehmender.
 */
export async function loadAnswers(formId: string, questionIds?: string[]): Promise<Answer[]> {
  assertId(formId);
  if (questionIds && !questionIds.length) return [];
  return fetchAll<Answer>((a, b) => {
    let query = supabase.from("answers").select("response_id, question_id, value, responses!inner(form_id)").eq("responses.form_id", formId);
    if (questionIds) query = query.in("question_id", questionIds);
    return query.range(a, b);
  });
}

/** Tafel: Antworten auf diese Fragen aus Abgaben ab `since` (ISO) – ältere Events tauchen in der Wortwolke nicht auf. */
export async function loadAnswersSince(formId: string, questionIds: string[], since: string): Promise<Answer[]> {
  assertId(formId);
  if (!questionIds.length) return [];
  return fetchAll<Answer>((a, b) =>
    supabase
      .from("answers")
      .select("response_id, question_id, value, responses!inner(form_id, created_at)")
      .eq("responses.form_id", formId)
      .gte("responses.created_at", since)
      .in("question_id", questionIds)
      .range(a, b)
  );
}

/** Nur den Status setzen (z. B. „Live schalten“ von der Tafel aus), ohne Fragen oder settings anzufassen. */
export async function setFormStatus(id: string, status: Form["status"]): Promise<void> {
  assertId(id);
  unwrap(await supabase.from("forms").update({ status }).eq("id", id));
}

// ---------- Metadaten (Server: Seitentitel, Link-Vorschau) ----------

/** Titel + Beschreibung für Seitentitel und Open-Graph-Vorschau. null = nicht gefunden, im Papierkorb oder Fehler. */
export async function formMeta(slugOrId: string): Promise<{ title: string; description: string | null } | null> {
  try {
    const column = UUID.test(slugOrId) ? "id" : "public_slug";
    if (column === "public_slug" && !/^[a-z0-9-]{1,64}$/i.test(slugOrId)) return null;
    const res = await supabase.from("forms").select("title, description, settings").eq(column, slugOrId).maybeSingle();
    const row = res.data as Pick<Form, "title" | "description" | "settings"> | null;
    if (!row || row.settings?.geloescht) return null;
    return { title: row.title, description: row.description };
  } catch {
    return null;
  }
}
