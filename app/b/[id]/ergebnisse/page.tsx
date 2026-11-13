"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { loadAnswers, loadForm, loadResponses } from "@/lib/data";
import { fillVars, sortByStep, stepName } from "@/lib/framework";
import { computeKpis } from "@/lib/kpi";
import { Answer, Form, Question } from "@/lib/types";
import { average, distribution, isAnswerable, kindOf, levelScore, typeOf } from "@/question-types";

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
              <td style={{ width: "38%" }}>{option.label === option.short ? option.label : `${option.short}: ${option.label}`}</td>
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
  const [group, setGroup] = useState("");

  useEffect(() => {
    Promise.all([loadForm(id), loadResponses(id), loadAnswers(id)]).then(
      ([f, responses, answers]) => setData({ form: f.form, questions: sortByStep(f.questions), responses, answers }),
      (e: Error) => setError(e.message)
    );
  }, [id]);

  const zielgruppe = data?.questions.find((q) => q.settings.slotId === "zielgruppe");

  /** Filter nach Zielgruppe (Schritt 1) wirkt auf alle Kacheln und Fragen. */
  const view = useMemo(() => {
    if (!data) return null;
    if (!group || !zielgruppe) return { responses: data.responses, answers: data.answers };
    const ids = new Set(data.answers.filter((a) => a.question_id === zielgruppe.id && a.value === group).map((a) => a.response_id));
    return { responses: data.responses.filter((r) => ids.has(r.id)), answers: data.answers.filter((a) => ids.has(a.response_id)) };
  }, [data, group, zielgruppe]);

  function exportCsv() {
    if (!data) return;
    const qById = new Map(data.questions.map((q) => [q.id, q]));
    const time = new Map(data.responses.map((r) => [r.id, r.created_at]));
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [["zeitpunkt", "antwort_id", "step", "bereich", "slot_id", "kpi", "frage", "antwort", "score"].map(esc).join(";")];
    for (const a of data.answers) {
      const q = qById.get(a.question_id);
      if (!q) continue;
      const score = kindOf(q) === "levels" ? levelScore(q, a.value) : q.type === "scale" ? Number(a.value) : null;
      lines.push(
        [new Date(time.get(a.response_id) ?? "").toLocaleString("de-DE"), a.response_id, q.step ?? "", stepName(q.step), q.settings.slotId ?? "", q.settings.kpi ?? "", fillVars(q.label, data.form), typeOf(q).format(q, a.value), score ?? ""]
          .map(esc)
          .join(";")
      );
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
        <Link className="btn" href={`/b/${id}/bearbeiten`}>Zum Editor</Link>
        <button type="button" className="btn primary" onClick={exportCsv} disabled={!data?.answers.length}>CSV exportieren</button>
      </AdminHeader>
      <main className="admin-main admin-narrow">
        {error && <p className="error">{error}</p>}
        {!data || !view ? (
          !error && <p className="muted">Lädt …</p>
        ) : (
          <>
            <h1>{data.form.title}</h1>
            <div className="row spread">
              <p><strong>{view.responses.length}</strong> Antworten</p>
              {zielgruppe && (
                <label className="row">
                  Zielgruppe
                  <select value={group} onChange={(e) => setGroup(e.target.value)} className="filter">
                    <option value="">alle</option>
                    {zielgruppe.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              )}
            </div>
            {view.responses.length < 10 && <div className="warn">Wenige Antworten – nur eine Tendenz.</div>}
            <div className="kpis">
              {computeKpis(data.questions, view.answers).map((k) => (
                <div key={k.key} className="kpi" title={k.hint}>
                  <span className="kpi-label">{k.label}</span>
                  <span className="kpi-value">{k.value ?? "–"}</span>
                  <span className="muted">n = {k.n}</span>
                </div>
              ))}
            </div>
            {data.questions.map((q, i) => (
              <section key={q.id} className="panel">
                <div className="muted">Frage {i + 1} · {typeOf(q).label} · {stepName(q.step)}{q.settings.kpi ? ` · KPI ${q.settings.kpi}` : ""}</div>
                <h2>{fillVars(q.label, data.form) || "(ohne Fragetext)"}</h2>
                <Summary q={q} answers={view.answers} responseCount={view.responses.length} />
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}
