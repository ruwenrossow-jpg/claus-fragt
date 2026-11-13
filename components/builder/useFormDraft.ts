"use client";

import { useEffect, useState } from "react";
import { countResponses, loadForm, saveForm } from "@/lib/data";
import { configOf, questionForSlot, slotsFor, sortByStep } from "@/lib/framework";
import { getStyle } from "@/lib/styles";
import { Form, FormSettings, Question } from "@/lib/types";
import { QuestionKind, getType, newQuestion } from "@/question-types";

/** Lokaler Entwurf eines Bogens: Änderungen bleiben im Browser, bis save() aufgerufen wird. Fragen sind immer nach Bereich sortiert. */
export function useFormDraft(id: string) {
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false; // verhindert, dass eine verspätete Antwort bereits getippte Änderungen überschreibt
    Promise.all([loadForm(id), countResponses(id)]).then(
      ([d, count]) => {
        if (cancelled) return;
        setForm(d.form);
        setQuestions(sortByStep(d.questions));
        setResponseCount(count);
      },
      (e: Error) => !cancelled && setError(e.message)
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Warnung beim Verlassen mit ungespeicherten Änderungen
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const changeQuestions = (fn: (qs: Question[]) => Question[]) => {
    setQuestions((qs) => sortByStep(fn(qs)));
    setDirty(true);
  };
  const patchForm = (patch: Partial<Form>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setDirty(true);
  };
  const removeIds = (ids: string[]) => setRemoved((r) => [...r, ...ids]);

  return {
    form,
    questions,
    responseCount,
    dirty,
    saving,
    error,
    patchForm,
    patchSettings(patch: Partial<FormSettings>) {
      setForm((f) => (f ? { ...f, settings: { ...f.settings, ...patch } } : f));
      setDirty(true);
    },
    /** Style wechseln: Stufen im Ziel-Platz folgen, solange sie nicht von Hand geändert wurden. */
    setStyle(style: string) {
      if (!form) return;
      const before = getStyle(form.style).zielLevels.join("|");
      const after = getStyle(style).zielLevels;
      patchForm({ style });
      changeQuestions((qs) => qs.map((q) => (q.settings.slotId === "ziel" && q.options.join("|") === before ? { ...q, options: [...after] } : q)));
    },
    /** Teach an/aus: Platz „Weitertragen“ hinzufügen bzw. entfernen. */
    setTeach(teach: boolean) {
      if (!form) return;
      setForm((f) => (f ? { ...f, settings: { ...f.settings, teach } } : f));
      const existing = questions.filter((q) => q.settings.slotId === "weitertragen");
      if (teach && !existing.length) {
        const slot = slotsFor({ ...configOf(form), teach: true }).find((s) => s.id === "weitertragen")!;
        changeQuestions((qs) => [...qs, questionForSlot(id, slot)]);
      } else if (!teach && existing.length) {
        removeIds(existing.map((q) => q.id));
        changeQuestions((qs) => qs.filter((q) => q.settings.slotId !== "weitertragen"));
      }
      setDirty(true);
    },
    patchQuestion(qid: string, patch: Partial<Question>) {
      changeQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
    },
    changeKind(qid: string, kind: QuestionKind) {
      changeQuestions((qs) => qs.map((q) => (q.id === qid ? getType(kind).apply(q) : q)));
    },
    /** Eigene Frage am Ende eines Bereichs. Gibt die neue id zurück. */
    addQuestion(kind: QuestionKind, step: number | null): string {
      const q = { ...newQuestion(id, kind), step };
      changeQuestions((qs) => [...qs, q]);
      return q.id;
    },
    removeQuestion(qid: string) {
      changeQuestions((qs) => qs.filter((q) => q.id !== qid));
      removeIds([qid]);
    },
    duplicateQuestion(qid: string) {
      changeQuestions((qs) => {
        const i = qs.findIndex((q) => q.id === qid);
        // Kopie ist eine eigene Frage, kein Platz → ohne slotId/kpi
        const settings = { ...qs[i].settings, slotId: undefined, kpi: undefined };
        const copy: Question = { ...qs[i], id: crypto.randomUUID(), options: [...qs[i].options], settings };
        return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
      });
    },
    /** Verschieben nur innerhalb des Bereichs – die Bereiche selbst sind fest. */
    move(qid: string, dir: -1 | 1) {
      changeQuestions((qs) => {
        const i = qs.findIndex((q) => q.id === qid);
        const j = i + dir;
        if (j < 0 || j >= qs.length || qs[j].step !== qs[i].step) return qs;
        const next = [...qs];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    },
    /** Speichert; patch wird vorher übernommen (z. B. Status beim Live schalten). */
    async save(patch: Partial<Form> = {}) {
      if (!form) return;
      const toSave = { ...form, ...patch };
      setSaving(true);
      setError(null);
      try {
        const slug = await saveForm(toSave, questions, removed);
        setForm({ ...toSave, public_slug: slug });
        setRemoved([]);
        setDirty(false);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
  };
}

export type FormDraft = ReturnType<typeof useFormDraft>;
