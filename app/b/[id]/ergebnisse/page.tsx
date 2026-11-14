"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { Icon } from "@/components/admin/icons";
import { PageState } from "@/components/admin/PageState";
import { Select, SelectOption } from "@/components/admin/Select";
import { buildSurvey } from "@/components/survey/context";
import { loadAnswers, loadForm, loadResponses } from "@/lib/data";
import { computeKpis } from "@/lib/kpi";
import { Answer, AnswerValue, Form, Question, isTrashed } from "@/lib/types";
import { ResultOption, average, distribution, isAnswerable, kindOf, levelScore, typeOf } from "@/question-types";

interface Data {
  form: Form;
  questions: Question[];
  responses: { id: string; created_at: string }[];
  answers: Answer[];
}

const matchesOption = (q: Question, v: AnswerValue, o: ResultOption) => (typeOf(q).matches ?? ((x: AnswerValue, y: ResultOption) => x === y.value))(v, o);

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

/** Auswertung: Kennzahlen (nur wenn passende Daten da sind), Filter nach einer Antwort, je Frage, CSV. */
export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadForm(id), loadResponses(id), loadAnswers(id)]).then(
      ([f, responses, answers]) => !cancelled && setData({ form: f.form, questions: f.questions, responses, answers }),
      (e: unknown) => !cancelled && setError(e)
    );
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const labelOf = useMemo(() => (data ? buildSurvey(data.form, data.questions).labelOf : () => ""), [data]);

  /** Filter-Optionen: jede Antwort jeder Auswahlfrage (Einfachauswahl, Stufen, Ja/Nein). */
  const filterOptions = useMemo<SelectOption<string>[]>(() => {
    const opts: SelectOption<string>[] = [{ value: "", label: "Alle Antworten" }];
    for (const q of data?.questions ?? []) {
      if (q.type !== "single_choice" && q.type !== "yes_no") continue;
      typeOf(q).resultOptions?.(q).forEach((o, i) => opts.push({ value: `${q.id}|${i}`, label: o.label, group: i === 0 ? labelOf(q) : undefined }));
    }
    return opts;
  }, [data, labelOf]);

  const view = useMemo(() => {
    if (!data) return null;
    const [qid, idx] = filter.split("|");
    const q = data.questions.find((x) => x.id === qid);
    const option = q && typeOf(q).resultOptions?.(q)[Number(idx)];
    if (!q || !option) return { responses: data.responses, answers: data.answers };
    const ids = new Set(data.answers.filter((a) => a.question_id === q.id && matchesOption(q, a.value, option)).map((a) => a.response_id));
    return { responses: data.responses.filter((r) => ids.has(r.id)), answers: data.answers.filter((a) => ids.has(a.response_id)) };
  }, [data, filter]);

  function exportCsv() {
    if (!data) return;
    const qById = new Map(data.questions.map((q, i) => [q.id, { q, nr: i + 1 }]));
    const time = new Map(data.responses.map((r) => [r.id, r.created_at]));
    // Anführungszeichen verdoppeln; Formel-Anfänge (= + - @) entschärfen, damit Excel nichts ausführt
    const esc = (s: string | number) => {
      const t = String(s);
      return `"${(typeof s === "string" && /^[=+\-@\t\r]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`;
    };
    const lines = [["zeitpunkt", "antwort_id", "frage_nr", "frage", "frageart", "antwort", "score", "step", "slot_id", "kpi"].map(esc).join(";")];
    for (const a of data.answers) {
      const entry = qById.get(a.question_id);
      if (!entry) continue;
      const { q, nr } = entry;
      const score = kindOf(q) === "levels" ? levelScore(q, a.value) : q.type === "scale" ? Number(a.value) : null;
      lines.push(
        [new Date(time.get(a.response_id) ?? "").toLocaleString("de-DE"), a.response_id, nr, labelOf(q), typeOf(q).label, typeOf(q).format(q, a.value), score ?? "", q.step ?? "", q.settings.slotId ?? "", q.settings.kpi ?? ""]
          .map(esc)
          .join(";")
      );
    }
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(data.form.title || "auswertung").replace(/[\\/:*?"<>|]+/g, "-").trim()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const kpis = data && view ? computeKpis(data.questions, view.answers, labelOf) : [];
  if (!data || !view) return <PageState error={error} onRetry={() => { setError(null); setReloadKey((k) => k + 1); }} />;

  return (
    <>
      <AdminHeader>
        <Link className="btn ghost" href={`/b/${id}/bearbeiten`}><Icon name="edit" size={18} /> Zum Editor</Link>
        <button type="button" className="btn primary" onClick={exportCsv} disabled={!data.answers.length}>CSV exportieren</button>
      </AdminHeader>
      <main className="admin-main admin-narrow">
        <Link href="/meine-boegen" className="back-link"><Icon name="back" size={18} /> Meine Bögen</Link>
        <>
            <h1 style={{ marginTop: 12 }}>{data.form.title}</h1>
            {isTrashed(data.form) && <div className="warn">Dieser Bogen liegt im Papierkorb – die Ergebnisse bleiben erhalten.</div>}
            {data.responses.length === 0 && (
              <div className="panel">
                <h2>Noch keine Antworten</h2>
                <p className="muted">Sobald jemand den Bogen ausfüllt, erscheinen hier Kennzahlen und die Auswertung je Frage. Den Link findest du im Editor unter „Speichern &amp; abschließen“.</p>
              </div>
            )}
            {data.responses.length > 0 && <div className="row spread">
              <p><strong>{view.responses.length}</strong> {view.responses.length === 1 ? "Antwort" : "Antworten"}</p>
              {filterOptions.length > 1 && (
                <div className="row" style={{ minWidth: 260 }}>
                  <span className="muted">Filter</span>
                  <div style={{ flex: 1 }}>
                    <Select label="Nach Antwort filtern" value={filter} options={filterOptions} onChange={setFilter} />
                  </div>
                </div>
              )}
            </div>}
            {view.responses.length > 0 && view.responses.length < 10 && <div className="warn">Wenige Antworten – nur eine Tendenz.</div>}
            {kpis.length > 0 && (
              <div className="kpis">
                {kpis.map((k) => (
                  <div key={k.key} className="kpi">
                    <span className="kpi-label">{k.label}</span>
                    <span className="kpi-value">{k.value}</span>
                    <span className="muted">{k.hint} · n = {k.n}</span>
                  </div>
                ))}
              </div>
            )}
            {data.questions.length === 0 && <p className="muted">Der Bogen hat noch keine Fragen.</p>}
            {data.questions.map((q, i) => (
              <section key={q.id} className="panel">
                <div className="muted">Frage {i + 1} · {typeOf(q).label}</div>
                <h2>{labelOf(q) || "(ohne Fragetext)"}</h2>
                <Summary q={q} answers={view.answers} responseCount={view.responses.length} />
              </section>
            ))}
        </>
      </main>
    </>
  );
}
