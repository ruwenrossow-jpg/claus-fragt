"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { countResponses, loadForm, saveForm } from "@/lib/data";
import { getTheme } from "@/brand/themes";
import { legacyLabel } from "@/lib/legacy";
import { Form, Question } from "@/lib/types";
import { QuestionKind, getType, newQuestion } from "@/question-types";

/** Pause nach der letzten Änderung, bevor automatisch gespeichert wird. */
const AUTOSAVE_MS = 800;

export type SaveState = "saved" | "pending" | "saving" | "error";

/**
 * Entwurf eines Bogens mit Autosave wie bei Google Forms: jede Änderung wird nach kurzer Pause gespeichert,
 * es gibt keinen Speichern-Knopf und keine „Seite verlassen?“-Abfrage.
 * Änderungen während eines laufenden Speicherns werden danach nachgespeichert (Revisionszähler).
 */
export function useFormDraft(id: string) {
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  /** Fehler beim Speichern (Text) */
  const [error, setError] = useState<string | null>(null);
  /** Fehler beim Laden (DataError: nicht gefunden / offline) */
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Aktueller Stand für das Speichern außerhalb des Render-Zyklus
  const latest = useRef<{ form: Form | null; questions: Question[]; removed: string[] }>({ form: null, questions: [], removed: [] });
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false; // verhindert, dass eine verspätete Antwort bereits getippte Änderungen überschreibt
    Promise.all([loadForm(id), countResponses(id)]).then(
      ([d, count]) => {
        if (cancelled) return;
        const theme = getTheme(d.form.style);
        // v1-Bögen: leere Pflicht-Plätze bekommen ihren bisherigen Beispieltext als echten Text
        const qs = d.questions.map((q) => (q.label.trim() ? q : { ...q, label: legacyLabel(q, d.form, d.form.settings?.ansprache ?? theme.ansprache) }));
        latest.current = { form: d.form, questions: qs, removed: [] };
        setForm(d.form);
        setQuestions(qs);
        setResponseCount(count);
      },
      (e: unknown) => !cancelled && setLoadError(e)
    );
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const snap = latest.current;
    if (!snap.form || saving.current || revision.current === savedRevision.current) return;
    const rev = revision.current;
    saving.current = true;
    setSaveState("saving");
    try {
      const slug = await saveForm(snap.form, snap.questions, snap.removed);
      savedRevision.current = rev;
      latest.current.removed = latest.current.removed.filter((r) => !snap.removed.includes(r));
      if (latest.current.form && !latest.current.form.public_slug) latest.current.form = { ...latest.current.form, public_slug: slug };
      setForm((f) => (f && !f.public_slug ? { ...f, public_slug: slug } : f));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setSaveState("error");
      saving.current = false;
      return;
    }
    saving.current = false;
    if (revision.current !== savedRevision.current) flush();
    else setSaveState("saved");
  }, []);

  // Beim Verlassen der Seite/Wechsel des Tabs sofort speichern statt zu warnen
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const touch = (next: { form?: Form; questions?: Question[]; removed?: string[] }, now = false) => {
    latest.current = { ...latest.current, ...next };
    if (next.form) setForm(next.form);
    if (next.questions) setQuestions(next.questions);
    revision.current++;
    setSaveState("pending");
    clearTimeout(timer.current);
    if (now) flush();
    else timer.current = setTimeout(flush, AUTOSAVE_MS);
  };
  const changeQuestions = (fn: (qs: Question[]) => Question[]) => touch({ questions: fn(latest.current.questions) });

  return {
    form,
    questions,
    responseCount,
    saveState,
    error,
    loadError,
    /** Laden erneut versuchen */
    reload() {
      setLoadError(null);
      setReloadKey((k) => k + 1);
    },
    /** Bogen-Felder ändern; now = sofort speichern (z. B. Live schalten) */
    patchForm(patch: Partial<Form>, now = false) {
      if (latest.current.form) touch({ form: { ...latest.current.form, ...patch } }, now);
    },
    /** Erneut versuchen nach einem Fehler */
    retry: flush,
    /** Sofort speichern (z. B. „Speichern & abschließen“) und warten, bis alles gespeichert ist – auch ein laufendes Speichern. */
    async saveNow() {
      for (let i = 0; i < 50 && latest.current.form; i++) {
        if (!saving.current && revision.current === savedRevision.current) return;
        if (!saving.current) {
          await flush();
          if (revision.current !== savedRevision.current && !saving.current) return; // Fehler → Statusanzeige
        } else await new Promise((r) => setTimeout(r, 100));
      }
    },
    patchQuestion(qid: string, patch: Partial<Question>) {
      changeQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
    },
    changeKind(qid: string, kind: QuestionKind) {
      changeQuestions((qs) => qs.map((q) => (q.id === qid ? getType(kind).apply(q) : q)));
    },
    /** Neue Frage nach `afterId` (sonst am Ende). Gibt die neue id zurück. */
    addQuestion(kind: QuestionKind, afterId?: string): string {
      const q = newQuestion(id, kind);
      changeQuestions((qs) => {
        const i = afterId ? qs.findIndex((x) => x.id === afterId) : -1;
        return i < 0 ? [...qs, q] : [...qs.slice(0, i + 1), q, ...qs.slice(i + 1)];
      });
      return q.id;
    },
    /** Vorschlag aus der Ablauf-Idee: vor der ersten Frage eines späteren Bereichs einfügen, sonst ans Ende. */
    addSuggested(kind: QuestionKind, patch: Partial<Question>): string {
      const base = newQuestion(id, kind);
      const q: Question = { ...base, ...patch, settings: { ...base.settings, ...patch.settings } };
      changeQuestions((qs) => {
        const i = q.step == null ? -1 : qs.findIndex((x) => x.step != null && x.step > q.step!);
        return i < 0 ? [...qs, q] : [...qs.slice(0, i), q, ...qs.slice(i)];
      });
      return q.id;
    },
    removeQuestion(qid: string) {
      touch({ questions: latest.current.questions.filter((q) => q.id !== qid), removed: [...latest.current.removed, qid] });
    },
    /** Kopie direkt darunter; gibt die neue id zurück. Die Kopie ist eine eigene Frage (ohne Framework-Zuordnung). */
    duplicateQuestion(qid: string): string {
      const newId = crypto.randomUUID();
      changeQuestions((qs) => {
        const i = qs.findIndex((q) => q.id === qid);
        const settings = { ...qs[i].settings, slotId: undefined, kpi: undefined };
        return [...qs.slice(0, i + 1), { ...qs[i], id: newId, options: [...qs[i].options], settings }, ...qs.slice(i + 1)];
      });
      return newId;
    },
    move(qid: string, dir: -1 | 1) {
      changeQuestions((qs) => {
        const i = qs.findIndex((q) => q.id === qid);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= qs.length) return qs;
        const next = [...qs];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    },
  };
}

