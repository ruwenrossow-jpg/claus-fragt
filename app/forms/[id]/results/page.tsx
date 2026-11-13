"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { loadAnswers, loadForm, loadResponses } from "@/lib/data";
import { stepName } from "@/lib/framework";
import { Answer, AnswerValue, Form, Question } from "@/lib/types";
import { average, distribution, isAnswerable, typeOf } from "@/question-types";

interface Data {
  form: Form;
  questions: Question[];
  responses: { id: string; created_at: string }[];
  answers: Answer[];
}

function Summary({ q, answers, responseCount }: { q: Question; answers: Answer[]; responseCount: number }) {
  const own = answers.filter((a) => a.question_id === q.id);
  const header = <p className="muted">{own.length} von {responseCount} haben geantwortet</p>;

  if (!isAnswerable(q)) {
    return (
      <>
        {header}
        <ul>{own.map((a, i) => <li key={i} style={{ whiteSpace: "pre-wrap" }}>{typeOf(q).format(q, a.value)}</li>)}</ul>
      </>
    );
  }
  const { rows } = distribution(q, answers);
  const avg = average(q, answers);
  return (
    <>
      {header}
      {avg !== null && <p>Durchschnitt: <strong>{avg.toLocaleString("de-DE", { maximumFractionDigits: 2 })}</strong></p>}
      <table>
        <tbody>
          {rows.map(({ option, count, share }) => (
            <tr key={String(option.value)}>
              <td style={{ width: "35%" }}>{option.label === option.short ? option.label : `${option.short}: ${option.label}`}</td>
              <td><div className="bar-track"><div className="bar-fill" style={{ width: `${share * 100}%` }} /></div></td>
              <td style={{ width: 90, textAlign: "right" }}>{count} ({Math.round(share * 100)} %)</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadForm(id), loadResponses(id), loadAnswers(id)]).then(
      ([f, responses, answers]) => setData({ ...f, responses, answers }),
      (e: Error) => setError(e.message)
    );
  }, [id]);

  function exportCsv() {
    if (!data) return;
    const byResponse = new Map<string, Map<string, AnswerValue>>();
    for (const a of data.answers) {
      if (!byResponse.has(a.response_id)) byResponse.set(a.response_id, new Map());
      byResponse.get(a.response_id)!.set(a.question_id, a.value);
    }
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const head = ["Zeitpunkt", ...data.questions.map((q) => (q.step ? `[${stepName(q.step)}] ` : "") + q.label)];
    const lines = [head.map(esc).join(";")];
    for (const r of data.responses) {
      const m = byResponse.get(r.id);
      lines.push([new Date(r.created_at).toLocaleString("de-DE"), ...data.questions.map((q) => typeOf(q).format(q, m?.get(q.id)))].map(esc).join(";"));
    }
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.form.title || "auswertung"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <AdminHeader>
        <Link className="btn" href={`/forms/${id}/edit`}>Zum Builder</Link>
        <button type="button" className="btn primary" onClick={exportCsv} disabled={!data?.responses.length}>CSV exportieren</button>
      </AdminHeader>
      <main className="admin-main admin-narrow">
        {error && <p className="error">{error}</p>}
        {!data ? (
          !error && <p className="muted">Lädt …</p>
        ) : (
          <>
            <h1>{data.form.title}</h1>
            <p><strong>{data.responses.length}</strong> Antworten</p>
            {data.questions.map((q, i) => (
              <section key={q.id} className="panel">
                <div className="muted">Frage {i + 1} · {typeOf(q).label}{q.step ? ` · ${stepName(q.step)}` : ""}</div>
                <h2>{q.label || "(ohne Fragetext)"}</h2>
                <Summary q={q} answers={data.answers} responseCount={data.responses.length} />
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}
