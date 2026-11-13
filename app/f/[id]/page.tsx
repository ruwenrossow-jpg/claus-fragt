"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AnswerValue, Form, Question, scaleRange } from "@/lib/types";
import { stepName } from "@/lib/framework";

function isEmpty(v: AnswerValue | undefined) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

function QuestionInput({ q, value, onChange }: { q: Question; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void }) {
  switch (q.type) {
    case "short_text":
      return <input type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "long_text":
      return <textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "single_choice":
      return (
        <div>
          {q.options.map((o, i) => (
            <label key={i} className="opt">
              <input type="radio" name={q.id} checked={value === o} onChange={() => onChange(o)} /> {o}
            </label>
          ))}
        </div>
      );
    case "multiple_choice": {
      const arr = (value as string[]) ?? [];
      return (
        <div>
          {q.options.map((o, i) => (
            <label key={i} className="opt">
              <input type="checkbox" checked={arr.includes(o)} onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} /> {o}
            </label>
          ))}
        </div>
      );
    }
    case "scale":
      return (
        <div className="row">
          {q.settings.minLabel && <span className="muted">{q.settings.minLabel}</span>}
          {scaleRange(q.settings).map((n) => (
            <label key={n} className="opt" style={{ flexDirection: "column", gap: 2 }}>
              <span>{n}</span>
              <input type="radio" name={q.id} checked={value === n} onChange={() => onChange(n)} />
            </label>
          ))}
          {q.settings.maxLabel && <span className="muted">{q.settings.maxLabel}</span>}
        </div>
      );
    case "yes_no":
      return (
        <div className="row">
          <label className="opt"><input type="radio" name={q.id} checked={value === true} onChange={() => onChange(true)} /> Ja</label>
          <label className="opt"><input type="radio" name={q.id} checked={value === false} onChange={() => onChange(false)} /> Nein</label>
        </div>
      );
  }
}

export default function FillForm() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [f, q] = await Promise.all([
        supabase.from("forms").select("*").eq("id", id).single(),
        supabase.from("questions").select("*").eq("form_id", id).order("position"),
      ]);
      if (f.error) return setError("Bogen nicht gefunden.");
      setForm(f.data as Form);
      setQuestions((q.data as Question[]) ?? []);
    })();
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const miss = questions.filter((q) => q.required && isEmpty(values[q.id])).map((q) => q.id);
    setMissing(miss);
    if (miss.length) return setError("Bitte alle Pflichtfragen beantworten.");
    setSending(true);
    setError(null);
    const responseId = crypto.randomUUID();
    const r = await supabase.from("responses").insert({ id: responseId, form_id: id });
    if (r.error) {
      setSending(false);
      return setError(r.error.message);
    }
    const rows = questions
      .filter((q) => !isEmpty(values[q.id]))
      .map((q) => ({ response_id: responseId, question_id: q.id, value: values[q.id] }));
    if (rows.length) {
      const a = await supabase.from("answers").insert(rows);
      if (a.error) {
        setSending(false);
        return setError(a.error.message);
      }
    }
    setDone(true);
  }

  if (error && !form) return <main><p className="error">{error}</p></main>;
  if (!form) return <main><p className="muted">Lädt …</p></main>;
  if (form.status === "closed") return <main><div className="card"><h1>{form.title}</h1><p>Dieser Bogen nimmt keine Antworten mehr an.</p></div></main>;
  if (done) return <main><div className="card"><h1>Danke!</h1><p>Deine Antworten wurden gespeichert.</p></div></main>;

  // Fragen nach Framework-Schritt gruppieren (in der Reihenfolge, wie sie im Bogen stehen)
  const groups: { step: number | null; items: Question[] }[] = [];
  for (const q of questions) {
    const last = groups[groups.length - 1];
    if (last && last.step === q.step) last.items.push(q);
    else groups.push({ step: q.step, items: [q] });
  }
  const showSteps = questions.some((q) => q.step != null);

  return (
    <main>
      {form.status === "draft" && <p className="muted">Vorschau – dieser Bogen ist noch ein Entwurf.</p>}
      <div className="card">
        <h1>{form.title}</h1>
        {form.description && <p style={{ whiteSpace: "pre-wrap" }}>{form.description}</p>}
        <p className="muted">* Pflichtfrage</p>
      </div>
      <form onSubmit={submit}>
        {groups.map((g, gi) => (
          <section key={gi}>
            {showSteps && <h2 className="step-title">{stepName(g.step)}</h2>}
            {g.items.map((q) => (
              <div key={q.id} className="card" style={missing.includes(q.id) ? { borderColor: "#b91c1c" } : undefined}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {q.label || <span className="muted">(ohne Fragetext)</span>} {q.required && <span className="error">*</span>}
                </div>
                {q.help_text && <div className="muted" style={{ marginBottom: 8 }}>{q.help_text}</div>}
                <QuestionInput q={q} value={values[q.id]} onChange={(v) => setValues((s) => ({ ...s, [q.id]: v }))} />
              </div>
            ))}
          </section>
        ))}
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={sending || questions.length === 0}>
          {sending ? "Sendet …" : "Absenden"}
        </button>
      </form>
    </main>
  );
}
