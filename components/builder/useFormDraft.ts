"use client";

import { useEffect, useState } from "react";
import { loadForm, saveForm } from "@/lib/data";
import { Form, Question } from "@/lib/types";
import { QuestionKind, getType, newQuestion } from "@/question-types";

/** Lokaler Entwurf eines Bogens: alle Änderungen bleiben im Browser, bis save() aufgerufen wird. */
export function useFormDraft(id: string) {
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false; // verhindert, dass eine verspätete Antwort bereits getippte Änderungen überschreibt
    loadForm(id).then(
      (d) => {
        if (cancelled) return;
        setForm(d.form);
        setQuestions(d.questions);
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
    setQuestions(fn);
    setDirty(true);
  };

  return {
    form,
    questions,
    dirty,
    saving,
    error,
    patchForm(patch: Partial<Form>) {
      setForm((f) => (f ? { ...f, ...patch } : f));
      setDirty(true);
    },
    patchQuestion(qid: string, patch: Partial<Question>) {
      changeQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
    },
    changeKind(qid: string, kind: QuestionKind) {
      changeQuestions((qs) => qs.map((q) => (q.id === qid ? getType(kind).apply(q) : q)));
    },
    /** Fügt eine Frage hinzu und gibt ihren Index zurück. */
    addQuestion(kind: QuestionKind): number {
      changeQuestions((qs) => [...qs, newQuestion(id, kind)]);
      return questions.length;
    },
    removeQuestion(qid: string) {
      changeQuestions((qs) => qs.filter((q) => q.id !== qid));
      setRemoved((r) => [...r, qid]);
    },
    duplicateQuestion(qid: string) {
      changeQuestions((qs) => {
        const i = qs.findIndex((q) => q.id === qid);
        const copy: Question = { ...qs[i], id: crypto.randomUUID(), options: [...qs[i].options], settings: { ...qs[i].settings } };
        return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
      });
    },
    move(qid: string, dir: -1 | 1) {
      changeQuestions((qs) => {
        const i = qs.findIndex((q) => q.id === qid);
        const j = i + dir;
        if (j < 0 || j >= qs.length) return qs;
        const next = [...qs];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    },
    async save() {
      if (!form) return;
      setSaving(true);
      setError(null);
      try {
        await saveForm(form, questions, removed);
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
