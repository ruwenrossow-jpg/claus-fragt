"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Form, FormStatus, Question, QuestionType, QUESTION_TYPES, STATUS_LABELS } from "@/lib/types";
import { FRAMEWORK_STEPS } from "@/lib/framework";
import { FORM_STYLES } from "@/lib/styles";

const CHOICE_TYPES: QuestionType[] = ["single_choice", "multiple_choice"];

function newQuestion(formId: string, position: number): Question {
  return {
    id: crypto.randomUUID(),
    form_id: formId,
    position,
    step: null,
    type: "short_text",
    label: "",
    help_text: null,
    required: false,
    options: [],
    settings: {},
  };
}

export default function EditForm() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [f, q] = await Promise.all([
        supabase.from("forms").select("*").eq("id", id).single(),
        supabase.from("questions").select("*").eq("form_id", id).order("position"),
      ]);
      if (f.error) return setError(f.error.message);
      if (q.error) return setError(q.error.message);
      setForm(f.data as Form);
      setQuestions((q.data as Question[]) ?? []);
    })();
  }, [id]);

  // Warnung bei ungespeicherten Änderungen
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function patchForm(p: Partial<Form>) {
    setForm((f) => (f ? { ...f, ...p } : f));
    setDirty(true);
  }

  function patchQuestion(qid: string, p: Partial<Question>) {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...p } : q)));
    setDirty(true);
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, newQuestion(id, qs.length)]);
    setDirty(true);
  }

  function removeQuestion(qid: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== qid));
    setRemoved((r) => [...r, qid]);
    setDirty(true);
  }

  function duplicateQuestion(qid: string) {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.id === qid);
      const copy = { ...qs[i], id: crypto.randomUUID(), options: [...qs[i].options], settings: { ...qs[i].settings } };
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });
    setDirty(true);
  }

  function move(qid: string, dir: -1 | 1) {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.id === qid);
      const j = i + dir;
      if (j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    const f = await supabase
      .from("forms")
      .update({ title: form.title, description: form.description, status: form.status, style: form.style })
      .eq("id", id);
    if (f.error) {
      setSaving(false);
      return setError(f.error.message);
    }
    if (removed.length) {
      const d = await supabase.from("questions").delete().in("id", removed);
      if (d.error) {
        setSaving(false);
        return setError(d.error.message);
      }
    }
    if (questions.length) {
      const rows = questions.map((q, i) => ({ ...q, position: i, options: CHOICE_TYPES.includes(q.type) ? q.options : [] }));
      const u = await supabase.from("questions").upsert(rows);
      if (u.error) {
        setSaving(false);
        return setError(u.error.message);
      }
    }
    setRemoved([]);
    setDirty(false);
    setSaving(false);
    setMessage("Gespeichert");
    setTimeout(() => setMessage(null), 2000);
  }

  if (error && !form) return <main><p className="error">{error}</p></main>;
  if (!form) return <main><p className="muted">Lädt …</p></main>;

  return (
    <main>
      <div className="row spread">
        <Link href="/">← Alle Bögen</Link>
        <div className="row">
          <Link href={`/f/${id}`} target="_blank">Vorschau / Link</Link>
          <Link href={`/forms/${id}/results`}>Auswertung</Link>
          <button className="primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "Speichert …" : dirty ? "Speichern" : "Gespeichert"}
          </button>
        </div>
      </div>
      {message && <p className="muted">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="card">
        <input type="text" value={form.title} placeholder="Titel des Bogens" onChange={(e) => patchForm({ title: e.target.value })} style={{ fontSize: 22, fontWeight: 600 }} />
        <textarea value={form.description ?? ""} placeholder="Beschreibung (optional)" onChange={(e) => patchForm({ description: e.target.value || null })} style={{ marginTop: 8 }} />
        <div className="row" style={{ marginTop: 8 }}>
          <label className="muted">Status</label>
          <select value={form.status} onChange={(e) => patchForm({ status: e.target.value as FormStatus })} style={{ width: "auto" }}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="muted">Stil</label>
          <select value={form.style ?? "default"} onChange={(e) => patchForm({ style: e.target.value })} style={{ width: "auto" }}>
            {FORM_STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="card">
          <div className="row spread">
            <span className="muted">Frage {i + 1}</span>
            <div className="row">
              <button onClick={() => move(q.id, -1)} disabled={i === 0} title="Nach oben">↑</button>
              <button onClick={() => move(q.id, 1)} disabled={i === questions.length - 1} title="Nach unten">↓</button>
              <button onClick={() => duplicateQuestion(q.id)}>Duplizieren</button>
              <button className="danger" onClick={() => removeQuestion(q.id)}>Entfernen</button>
            </div>
          </div>
          <input type="text" value={q.label} placeholder="Fragetext" onChange={(e) => patchQuestion(q.id, { label: e.target.value })} style={{ marginTop: 8 }} />
          <input type="text" value={q.help_text ?? ""} placeholder="Hinweistext (optional)" onChange={(e) => patchQuestion(q.id, { help_text: e.target.value || null })} style={{ marginTop: 8 }} />
          <div className="row" style={{ marginTop: 8 }}>
            <select value={q.type} onChange={(e) => patchQuestion(q.id, { type: e.target.value as QuestionType })} style={{ width: "auto" }}>
              {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={q.step ?? ""} onChange={(e) => patchQuestion(q.id, { step: e.target.value ? Number(e.target.value) : null })} style={{ width: "auto" }} title="Schritt im 5er-Framework">
              <option value="">Framework-Schritt: –</option>
              {FRAMEWORK_STEPS.map((s) => <option key={s.step} value={s.step}>{s.name}</option>)}
            </select>
            <label className="opt">
              <input type="checkbox" checked={q.required} onChange={(e) => patchQuestion(q.id, { required: e.target.checked })} /> Pflichtfrage
            </label>
          </div>

          {CHOICE_TYPES.includes(q.type) && (
            <div style={{ marginTop: 8 }}>
              {q.options.map((o, oi) => (
                <div key={oi} className="row" style={{ marginTop: 4, flexWrap: "nowrap" }}>
                  <span className="muted">{q.type === "single_choice" ? "○" : "☐"}</span>
                  <input type="text" value={o} placeholder={`Option ${oi + 1}`} onChange={(e) => patchQuestion(q.id, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} />
                  <button onClick={() => patchQuestion(q.id, { options: q.options.filter((_, xi) => xi !== oi) })}>✕</button>
                </div>
              ))}
              <button onClick={() => patchQuestion(q.id, { options: [...q.options, ""] })} style={{ marginTop: 4 }}>+ Option</button>
            </div>
          )}

          {q.type === "scale" && (
            <div className="row" style={{ marginTop: 8 }}>
              <select value={q.settings.min ?? 1} onChange={(e) => patchQuestion(q.id, { settings: { ...q.settings, min: Number(e.target.value) } })} style={{ width: "auto" }}>
                {[0, 1].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>bis</span>
              <select value={q.settings.max ?? 5} onChange={(e) => patchQuestion(q.id, { settings: { ...q.settings, max: Number(e.target.value) } })} style={{ width: "auto" }}>
                {[3, 4, 5, 6, 7, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <input type="text" value={q.settings.minLabel ?? ""} placeholder="Beschriftung links (z. B. gar nicht)" onChange={(e) => patchQuestion(q.id, { settings: { ...q.settings, minLabel: e.target.value } })} style={{ flex: 1, width: "auto" }} />
              <input type="text" value={q.settings.maxLabel ?? ""} placeholder="Beschriftung rechts (z. B. sehr)" onChange={(e) => patchQuestion(q.id, { settings: { ...q.settings, maxLabel: e.target.value } })} style={{ flex: 1, width: "auto" }} />
            </div>
          )}
        </div>
      ))}

      <button onClick={addQuestion} style={{ width: "100%", marginTop: 8 }}>+ Frage hinzufügen</button>
    </main>
  );
}
