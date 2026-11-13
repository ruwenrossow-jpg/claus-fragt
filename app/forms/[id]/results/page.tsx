"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Answer, AnswerValue, Form, Question, scaleRange } from "@/lib/types";
import { stepName } from "@/lib/framework";

interface ResponseRow {
  id: string;
  created_at: string;
}

const PAGE = 1000;

// Supabase liefert max. 1000 Zeilen pro Abfrage, daher seitenweise laden.
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

function formatValue(v: AnswerValue | undefined): string {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join("; ");
  if (typeof v === "boolean") return v ? "Ja" : "Nein";
  return String(v);
}

function Bars({ counts, total }: { counts: [string, number][]; total: number }) {
  return (
    <table>
      <tbody>
        {counts.map(([label, n]) => (
          <tr key={label}>
            <td style={{ width: "35%" }}>{label}</td>
            <td><div className="bar" style={{ width: `${total ? (n / total) * 100 : 0}%`, minWidth: n ? 4 : 0 }} /></td>
            <td style={{ width: 70 }}>{n} ({total ? Math.round((n / total) * 100) : 0} %)</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Summary({ q, answers, responseCount }: { q: Question; answers: Answer[]; responseCount: number }) {
  const vals = answers.map((a) => a.value);
  const header = <div className="muted">{vals.length} von {responseCount} Antworten</div>;

  if (q.type === "short_text" || q.type === "long_text") {
    return (
      <>
        {header}
        <ul>{vals.map((v, i) => <li key={i} style={{ whiteSpace: "pre-wrap" }}>{formatValue(v)}</li>)}</ul>
      </>
    );
  }
  if (q.type === "single_choice" || q.type === "multiple_choice") {
    const counts = new Map<string, number>(q.options.map((o) => [o, 0]));
    for (const v of vals) for (const o of Array.isArray(v) ? v : [String(v)]) counts.set(o, (counts.get(o) ?? 0) + 1);
    return <>{header}<Bars counts={[...counts]} total={vals.length} /></>;
  }
  if (q.type === "yes_no") {
    const yes = vals.filter((v) => v === true).length;
    return <>{header}<Bars counts={[["Ja", yes], ["Nein", vals.length - yes]]} total={vals.length} /></>;
  }
  // scale
  const nums = vals.map(Number).filter((n) => !Number.isNaN(n));
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  const counts: [string, number][] = scaleRange(q.settings).map((n) => [String(n), nums.filter((x) => x === n).length]);
  return (
    <>
      {header}
      <p>Durchschnitt: <strong>{avg == null ? "–" : avg.toLocaleString("de-DE", { maximumFractionDigits: 2 })}</strong></p>
      <Bars counts={counts} total={nums.length} />
    </>
  );
}

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const f = await supabase.from("forms").select("*").eq("id", id).single();
        if (f.error) throw new Error(f.error.message);
        const q = await supabase.from("questions").select("*").eq("form_id", id).order("position");
        if (q.error) throw new Error(q.error.message);
        const resp = await fetchAll<ResponseRow>((a, b) =>
          supabase.from("responses").select("id, created_at").eq("form_id", id).order("created_at").range(a, b)
        );
        const ans = await fetchAll<Answer>((a, b) =>
          supabase.from("answers").select("response_id, question_id, value, responses!inner(form_id)").eq("responses.form_id", id).range(a, b)
        );
        setForm(f.data as Form);
        setQuestions((q.data as Question[]) ?? []);
        setResponses(resp);
        setAnswers(ans);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [id]);

  function exportCsv() {
    const byResponse = new Map<string, Map<string, AnswerValue>>();
    for (const a of answers) {
      if (!byResponse.has(a.response_id)) byResponse.set(a.response_id, new Map());
      byResponse.get(a.response_id)!.set(a.question_id, a.value);
    }
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const head = ["Zeitpunkt", ...questions.map((q) => (q.step ? `[${stepName(q.step)}] ` : "") + q.label)];
    const lines = [head.map(esc).join(";")];
    for (const r of responses) {
      const m = byResponse.get(r.id);
      lines.push([new Date(r.created_at).toLocaleString("de-DE"), ...questions.map((q) => formatValue(m?.get(q.id)))].map(esc).join(";"));
    }
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form?.title || "auswertung"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <main><p className="error">{error}</p></main>;
  if (!form) return <main><p className="muted">Lädt …</p></main>;

  return (
    <main>
      <div className="row spread">
        <Link href={`/forms/${id}/edit`}>← Zum Builder</Link>
        <button onClick={exportCsv} disabled={!responses.length}>CSV exportieren</button>
      </div>
      <div className="card">
        <h1>{form.title}</h1>
        <p><strong>{responses.length}</strong> Antworten</p>
      </div>
      {questions.map((q, i) => (
        <div key={q.id} className="card">
          <div className="muted">Frage {i + 1}{q.step ? ` · ${stepName(q.step)}` : ""}</div>
          <strong>{q.label || "(ohne Fragetext)"}</strong>
          <Summary q={q} answers={answers.filter((a) => a.question_id === q.id)} responseCount={responses.length} />
        </div>
      ))}
    </main>
  );
}
