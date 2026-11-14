"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { Icon } from "@/components/admin/icons";
import { PageState } from "@/components/admin/PageState";
import { buildSurvey } from "@/components/survey/context";
import { TafelResult, answerCount, useTafelAnswers } from "@/components/tafel/TafelResult";
import styles from "@/components/tafel/steuerung.module.css";
import { useTafel } from "@/components/tafel/useTafel";
import { loadForm } from "@/lib/data";
import { nextLabel } from "@/lib/tafel";
import { Form, Question, isTrashed } from "@/lib/types";
import { isAnswerable } from "@/question-types";

/**
 * Steuerung der Tafel für Laptop oder Handy (wie die Moderator-Ansicht bei Menti): Ablauf, aktuelle Frage, Antworten live
 * (auch bevor sie am Beamer gezeigt werden) und große Knöpfe. Ist ein Beamer (/b/<id>/tafel) offen, hält er den Stand und diese Seite
 * schickt Befehle; ohne Beamer hält die Steuerung selbst den Stand, damit die Handys trotzdem gemeinsam folgen (lib/tafel.ts).
 */
export default function SteuerungPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ form: Form; questions: Question[] } | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    setError(null);
    loadForm(id).then(setData, setError);
  }, [id]);
  useEffect(load, [load]);

  const survey = useMemo(() => (data ? buildSurvey(data.form, data.questions) : null), [data]);
  const tafelQs = useMemo(() => survey?.questions.filter((q) => q.settings.tafel) ?? [], [survey]);
  const ids = useMemo(() => tafelQs.map((q) => q.id), [tafelQs]);
  const { run: state, people, host, command: send } = useTafel(data?.form.id ?? null, "steuerung", ids);
  const current = state?.phase === "question" ? tafelQs[Math.min(state.index, tafelQs.length - 1)] : undefined;
  const answers = useTafelAnswers(data?.form.id ?? null, current?.id ?? null, state?.since);

  // Gleiche Tasten wie am Beamer (Presenter-Klicker am Laptop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!state || (e.target instanceof HTMLElement && e.target.closest("input, textarea, button"))) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) send({ cmd: "next" });
      else if (["ArrowLeft", "PageUp"].includes(e.key)) send({ cmd: "back" });
      else if (e.key.toLowerCase() === "z") send({ cmd: "show" });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [send, state]);

  if (!data || !survey) return <PageState error={error} onRetry={load} />;
  if (isTrashed(data.form)) return <PageState error={new Error("Dieser Bogen liegt im Papierkorb.")} />;
  const { form } = data;
  const total = tafelQs.length;
  const rest = survey.questions.length - total;
  const connected = state !== null;
  const beamer = host === "beamer";
  const beamerUrl = `/b/${form.id}/tafel`;
  const openBeamer = () => window.open(beamerUrl, "claus-beamer", "popup,width=1280,height=720");
  const n = answerCount(answers);

  return (
    <>
      <AdminHeader>
        <Link className="btn ghost" href={`/b/${form.id}/bearbeiten`}><Icon name="edit" size={18} /> <span className="hide-mobile">Editor</span></Link>
        <button type="button" className="btn" onClick={openBeamer} data-open-beamer><Icon name="board" size={18} /> <span className="hide-mobile">Beamer öffnen</span></button>
      </AdminHeader>
      <main className="admin-main">
        <h1>Tafel steuern: {form.title}</h1>
        <div className={styles.status}>
          <span className={`${styles.dot} ${beamer ? styles.on : connected ? styles.off : ""}`} data-beamer={beamer ? "on" : "off"}>{beamer ? "Beamer verbunden" : connected ? "Kein Beamer offen" : "Suche Beamer …"}</span>
          <span className={`${styles.dot} ${people ? styles.on : ""}`} data-people={people}>{people} {people === 1 ? "Handy" : "Handys"} dabei</span>
          {form.status !== "published" && <span className={`${styles.dot} ${styles.off}`}>Bogen ist nicht live</span>}
        </div>

        {connected && !beamer && (
          <section className={styles.setup} data-no-beamer>
            <h2>So startest du die Tafel</h2>
            <p>Die Handys folgen schon dieser Steuerung – niemand klickt sich allein durch. Damit alle die Fragen und Ergebnisse sehen:<br />
              1. Beamer öffnen und das Fenster auf den Beamer ziehen (Vollbild: Ctrl+Cmd+F am Mac, F11 unter Windows).<br />
              2. Hier steuern – am Laptop oder auf dem Handy. Am Beamer siehst du nur Fragen und Ergebnisse.</p>
            <button type="button" className="btn primary big" onClick={openBeamer}><Icon name="board" size={18} /> Beamer öffnen</button>
          </section>
        )}

        {total === 0 ? (
          <p className="warn">Dieser Bogen hat noch keine Tafel-Fragen. Schalte im Editor bei einer Frage „An der Tafel“ ein.</p>
        ) : (
          <div className={styles.layout}>
            <nav className={styles.stepsCol} aria-label="Ablauf">
              <ol className={styles.steps}>
                <li>
                  <button type="button" className={styles.stepBtn} aria-current={state?.phase === "lobby" ? "step" : undefined} disabled={!connected} onClick={() => send({ cmd: "lobby" })}>
                    <span className={styles.stepNo}>▶</span>
                    <span>Lobby<span className={styles.stepMeta}>QR-Code, alle kommen rein</span></span>
                  </button>
                </li>
                {tafelQs.map((q, i) => (
                  <li key={q.id}>
                    <button type="button" className={styles.stepBtn} aria-current={current?.id === q.id ? "step" : undefined} disabled={!connected} onClick={() => send({ cmd: "goto", index: i })} data-step={i + 1}>
                      <span className={styles.stepNo}>{i + 1}</span>
                      <span>{survey.labelOf(q)}<span className={styles.stepMeta}>{isAnswerable(q) ? "Balken" : "Wortwolke / Karten"}</span></span>
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" className={styles.stepBtn} aria-current={state?.phase === "end" ? "step" : undefined} disabled={!connected} onClick={() => send({ cmd: "end" })}>
                    <span className={styles.stepNo}>✓</span>
                    <span>Allein weiter<span className={styles.stepMeta}>{rest > 0 ? `${rest === 1 ? "1 Frage" : `${rest} Fragen`} jede:r für sich` : "danach ist der Bogen fertig"}</span></span>
                  </button>
                </li>
              </ol>
            </nav>

            <section className={styles.now} aria-live="polite">
              {!state ? (
                <p className={styles.empty}>Verbinde …</p>
              ) : state.phase === "lobby" ? (
                <>
                  <p className={styles.nowLabel}>Lobby</p>
                  <h2 className={styles.nowTitle}>Alle scannen den QR-Code am Beamer.</h2>
                  <p className={styles.nowCount}><strong>{people}</strong> {people === 1 ? "Handy ist" : "Handys sind"} drin. Sind alle da? Dann „Alle drin – los geht's“.</p>
                </>
              ) : state.phase === "end" || !current ? (
                <>
                  <p className={styles.nowLabel}>Gemeinsamer Teil beendet</p>
                  <h2 className={styles.nowTitle}>Die Handys gehen jetzt allein weiter.</h2>
                  <p className={styles.nowCount}>{rest > 0 ? `Noch ${rest === 1 ? "1 Frage" : `${rest} Fragen`} pro Person, danach Ergebnis und Danke.` : "Der Bogen ist damit fertig."}</p>
                </>
              ) : (
                <>
                  <p className={styles.nowLabel}>Frage {state.index + 1} von {total}</p>
                  <h2 className={styles.nowTitle} data-now-question>{survey.labelOf(current)}</h2>
                  <p className={styles.nowCount} data-count={n}><strong>{n}</strong> {n === 1 ? "Antwort" : "Antworten"} von {people}</p>
                  <div className={styles.preview}>{n ? <TafelResult question={current} answers={answers} view={state.view} compact /> : <p className={styles.empty}>Noch keine Antworten.</p>}</div>
                  <p className={styles.previewNote}>{!beamer ? "Kein Beamer offen – nur du siehst die Antworten." : state.show ? "Am Beamer sichtbar." : "Nur du siehst die Antworten – am Beamer erscheinen sie auf „Zeigen“."}</p>
                </>
              )}
            </section>
          </div>
        )}

        {total > 0 && (
          <div className={styles.bar}>
            <div className={styles.barGroup}>
              <button type="button" className="btn big" disabled={!connected || state?.phase === "lobby"} onClick={() => send({ cmd: "back" })} data-remote-back>Zurück</button>
            </div>
            <div className={styles.barGroup}>
              {current && !isAnswerable(current) && (
                <button type="button" className="btn big" onClick={() => send({ cmd: "view", view: state?.view === "karten" ? "wolke" : "karten" })} data-remote-view>
                  {state?.view === "karten" ? "Als Wolke" : "Als Karten"}
                </button>
              )}
              {current && <button type="button" className="btn big" onClick={() => send({ cmd: "show" })} data-remote-show>{state?.show ? "Verbergen" : "Zeigen"}</button>}
              {state?.phase === "end" ? (
                <button type="button" className="btn big" onClick={() => send({ cmd: "restart" })} data-remote-restart><Icon name="restart" size={18} /> Neu starten</button>
              ) : (
                <button type="button" className="btn primary big" disabled={!connected} onClick={() => send({ cmd: "next" })} data-remote-next>
                  {state ? nextLabel(state.phase, state.index, total) : "Weiter"} →
                </button>
              )}
            </div>
          </div>
        )}
        <p className={styles.keys}>Tasten (auch Presenter-Klicker): → weiter · ← zurück · Z zeigen.</p>
      </main>
    </>
  );
}
