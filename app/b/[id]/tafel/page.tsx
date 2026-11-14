"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/admin/icons";
import { PageState } from "@/components/admin/PageState";
import { QrCode } from "@/components/QrCode";
import { buildSurvey } from "@/components/survey/context";
import { WordCloud } from "@/components/tafel/WordCloud";
import styles from "@/components/tafel/tafel.module.css";
import { loadAnswersSince, loadForm, setFormStatus } from "@/lib/data";
import { hostTafel } from "@/lib/tafel";
import { Answer, Form, Question, isTrashed } from "@/lib/types";
import { cloudWords } from "@/lib/wordcloud";
import { distribution, isAnswerable, typeOf } from "@/question-types";

/** Stand der Moderation; liegt im Browser (localStorage), damit ein Neuladen der Seite nichts verliert. */
interface Run {
  phase: "lobby" | "question" | "end";
  index: number;
  /** Ergebnis am Beamer sichtbar? (erst auf „Zeigen“) */
  show: boolean;
  /** nur Abgaben ab diesem Zeitpunkt zählen (ältere Events tauchen nicht auf) */
  since: string;
}

const POLL_MS = 2000;
const fresh = (): Run => ({ phase: "lobby", index: 0, show: false, since: new Date(Date.now() - 30_000).toISOString() });

/** Tafel (Beamer) wie bei Menti: QR → Frage für alle gleichzeitig → Zähler → „Zeigen“ → Wortwolke/Balken → nächste Frage. */
export default function TafelPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ form: Form; questions: Question[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [run, setRunState] = useState<Run | null>(null);
  const [people, setPeople] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [origin, setOrigin] = useState("");
  const host = useRef<ReturnType<typeof hostTafel> | null>(null);
  const storeKey = `tafel:${id}`;

  const load = useCallback(() => {
    setError(null);
    loadForm(id).then(setData, setError);
  }, [id]);
  useEffect(() => {
    setOrigin(window.location.origin);
    load();
    try {
      const saved = localStorage.getItem(storeKey);
      setRunState(saved ? (JSON.parse(saved) as Run) : fresh());
    } catch {
      setRunState(fresh());
    }
  }, [load, storeKey]);

  const setRun = useCallback(
    (next: Run) => {
      setRunState(next);
      try {
        localStorage.setItem(storeKey, JSON.stringify(next));
      } catch {}
    },
    [storeKey]
  );

  const survey = useMemo(() => (data ? buildSurvey(data.form, data.questions) : null), [data]);
  const tafelQs = useMemo(() => survey?.questions.filter((q) => q.settings.tafel) ?? [], [survey]);
  const current = run?.phase === "question" ? tafelQs[Math.min(run.index, tafelQs.length - 1)] : undefined;

  // Verbindung zu den Handys
  useEffect(() => {
    if (!data) return;
    host.current = hostTafel(data.form.id, setPeople);
    return () => host.current?.close();
  }, [data]);
  useEffect(() => {
    if (run) host.current?.publish({ phase: current ? "question" : run.phase === "question" ? "lobby" : run.phase, questionId: current?.id ?? null });
  }, [run, current, data]);

  // Antworten der aktuellen Frage zählen (alle 2 s)
  useEffect(() => {
    if (!current || !run || !data) return setAnswers([]);
    let alive = true;
    const tick = () => loadAnswersSince(data.form.id, [current.id], run.since).then((a) => alive && setAnswers(a), () => {});
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [current, run, data]);

  const forward = useCallback(() => {
    if (!run) return;
    if (run.phase === "lobby") return setRun({ ...run, phase: tafelQs.length ? "question" : "end", index: 0, show: false });
    if (run.phase === "question") return setRun(run.index + 1 < tafelQs.length ? { ...run, index: run.index + 1, show: false } : { ...run, phase: "end" });
  }, [run, tafelQs.length, setRun]);
  const backward = useCallback(() => {
    if (!run) return;
    if (run.phase === "end") return setRun({ ...run, phase: tafelQs.length ? "question" : "lobby", index: tafelQs.length - 1, show: true });
    if (run.phase === "question") return setRun(run.index > 0 ? { ...run, index: run.index - 1, show: true } : { ...run, phase: "lobby" });
  }, [run, tafelQs.length, setRun]);
  const toggle = useCallback(() => run && run.phase === "question" && setRun({ ...run, show: !run.show }), [run, setRun]);

  // Presenter-Klicker und Tastatur: → / Leertaste weiter, ← zurück, Z zeigen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) forward();
      else if (["ArrowLeft", "PageUp"].includes(e.key)) backward();
      else if (e.key.toLowerCase() === "z") toggle();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forward, backward, toggle]);

  if (!data || !survey || !run) return <PageState error={error} onRetry={load} />;
  if (isTrashed(data.form)) return <PageState error={new Error("Dieser Bogen liegt im Papierkorb.")} />;
  const { form } = data;
  const slug = form.public_slug ?? form.id;
  const url = `${origin}/f/${slug}`;

  async function goLive() {
    await setFormStatus(form.id, "published");
    load();
  }

  let center: React.ReactNode;
  if (!tafelQs.length) {
    center = (
      <div className={styles.center}>
        <h2 className={styles.question}>Noch keine Tafel-Fragen.</h2>
        <p className={styles.hidden}>Schalte im Editor bei einer Frage „An der Tafel“ ein.</p>
        <Link className="btn big" href={`/b/${form.id}/bearbeiten`}>Zum Editor</Link>
      </div>
    );
  } else if (run.phase === "lobby") {
    center = (
      <div className={styles.lobby}>
        <div>
          <h2>Handy raus und mitmachen!</h2>
          <p>Scan den Code – die nächsten {tafelQs.length === 1 ? "Frage beantworten" : `${tafelQs.length} Fragen beantworten`} wir alle gemeinsam.</p>
          <p className={styles.url}>{origin && url.replace(/^https?:\/\//, "")}</p>
          {form.status !== "published" && (
            <p className={styles.warn}>
              Der Bogen ist {form.status === "draft" ? "noch nicht live" : "geschlossen"} – so kann niemand antworten.
              <button type="button" className="btn primary" onClick={goLive}>Jetzt live schalten</button>
            </p>
          )}
          <img src={survey.theme.mascot.happy} alt="" className={styles.mascot} width={440} height={440} />
        </div>
        {origin ? <QrCode text={url} size={500} className={styles.qr} /> : <div className={styles.qr} />}
      </div>
    );
  } else if (run.phase === "end" || !current) {
    center = (
      <div className={styles.center}>
        <img src={survey.theme.mascot.happy} alt="" className={styles.mascot} width={440} height={440} />
        <h2 className={styles.question}>Danke! Der gemeinsame Teil ist geschafft.</h2>
        <p className={styles.count}>{survey.questions.length > tafelQs.length ? "Den Rest beantwortet jede:r für sich auf dem Handy." : "Ihr seid fertig."}</p>
      </div>
    );
  } else {
    const n = new Set(answers.map((a) => a.response_id)).size;
    center = (
      <div className={styles.center}>
        <h2 className={styles.question} data-tafel-question>{survey.labelOf(current)}</h2>
        <p className={styles.count} data-count={n}><strong>{n}</strong> {n === 1 ? "Antwort" : "Antworten"}</p>
        {run.show ? <Result question={current} answers={answers} /> : <p className={styles.hidden}>Ergebnis erscheint auf „Zeigen“.</p>}
      </div>
    );
  }

  const isQuestion = run.phase === "question" && current;
  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <h1 className={styles.title}>{form.title}</h1>
        <span className={styles.people} data-people={people}>{people} {people === 1 ? "Handy" : "Handys"} dabei</span>
      </div>
      {center}
      <div className={styles.controls}>
        <div className={styles.group}>
          <Link className="btn ghost" href={`/b/${form.id}/bearbeiten`}><Icon name="back" size={18} /> Editor</Link>
          {run.phase !== "lobby" && <button type="button" className="btn" onClick={backward} data-tafel-back>Zurück</button>}
        </div>
        <span className={styles.step}>{isQuestion ? `Frage ${run.index + 1} von ${tafelQs.length}` : ""}</span>
        <div className={styles.group}>
          {isQuestion && <button type="button" className="btn big" onClick={toggle} data-tafel-show>{run.show ? "Verbergen" : "Zeigen"}</button>}
          {run.phase === "end" ? (
            <button type="button" className="btn big" onClick={() => setRun(fresh())} data-tafel-restart><Icon name="restart" size={18} /> Neu starten</button>
          ) : (
            tafelQs.length > 0 && (
              <button type="button" className="btn primary big" onClick={forward} data-tafel-next>
                {run.phase === "lobby" ? "Los geht's" : run.index + 1 < tafelQs.length ? "Nächste Frage" : "Gemeinsamen Teil beenden"} →
              </button>
            )
          )}
        </div>
      </div>
    </main>
  );
}

/** Freitext → Wortwolke; Auswahl, Sterne, Skala, Ja/Nein → Balken. */
function Result({ question, answers }: { question: Question; answers: Answer[] }) {
  if (!isAnswerable(question)) {
    const texts = answers.map((a) => typeOf(question).format(question, a.value)).filter(Boolean);
    return <WordCloud words={cloudWords(texts)} />;
  }
  const { rows } = distribution(question, answers);
  return (
    <div className={styles.bars} data-bars>
      {rows.map(({ option, share }) => (
        <div key={String(option.value)} className={styles.barRow}>
          <span className={styles.barLabel}>{option.label}</span>
          <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${share * 100}%` }} /></div>
          <span className={styles.barPct}>{Math.round(share * 100)} %</span>
        </div>
      ))}
    </div>
  );
}
