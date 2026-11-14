"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/admin/icons";
import { PageState } from "@/components/admin/PageState";
import { QrCode } from "@/components/QrCode";
import { buildSurvey } from "@/components/survey/context";
import { TafelResult, answerCount, useTafelAnswers } from "@/components/tafel/TafelResult";
import styles from "@/components/tafel/tafel.module.css";
import { loadForm, setFormStatus } from "@/lib/data";
import { TafelCommand, TafelView, hostTafel, nextLabel } from "@/lib/tafel";
import { Form, Question, isTrashed } from "@/lib/types";
import { isAnswerable } from "@/question-types";

/** Stand der Tafel; liegt im Browser (localStorage), damit ein Neuladen nichts verliert. */
interface Run {
  phase: "lobby" | "question" | "end";
  index: number;
  /** Ergebnis am Beamer sichtbar? (erst auf „Zeigen“) */
  show: boolean;
  view: TafelView;
  /** nur Abgaben ab diesem Zeitpunkt zählen (ältere Events tauchen nicht auf) */
  since: string;
}

const fresh = (): Run => ({ phase: "lobby", index: 0, show: false, view: "wolke", since: new Date(Date.now() - 30_000).toISOString() });
const IDLE_MS = 3000;

/** Ein Befehl (Taste, Klick am Beamer oder von der Steuerung) → neuer Stand. */
function apply(run: Run, c: TafelCommand, total: number): Run {
  const last = Math.max(0, total - 1);
  switch (c.cmd) {
    case "next":
      if (run.phase === "lobby") return total ? { ...run, phase: "question", index: 0, show: false } : { ...run, phase: "end" };
      if (run.phase === "question") return run.index < last ? { ...run, index: run.index + 1, show: false } : { ...run, phase: "end" };
      return run;
    case "back":
      if (run.phase === "end") return total ? { ...run, phase: "question", index: last, show: true } : { ...run, phase: "lobby" };
      if (run.phase === "question") return run.index > 0 ? { ...run, index: run.index - 1, show: true } : { ...run, phase: "lobby" };
      return run;
    case "show":
      return run.phase === "question" ? { ...run, show: !run.show } : run;
    case "view":
      return { ...run, view: c.view };
    case "goto":
      return total ? { ...run, phase: "question", index: Math.min(Math.max(0, c.index), last), show: false } : run;
    case "lobby":
      return { ...run, phase: "lobby" };
    case "end":
      return { ...run, phase: "end" };
    case "restart":
      return fresh();
  }
}

/** Beamer (Tafel) wie bei Menti: Lobby mit QR → Frage für alle → Zähler → „Zeigen“ → Wortwolke/Karten/Balken → … → Ende. */
export default function TafelPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ form: Form; questions: Question[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [run, setRunState] = useState<Run | null>(null);
  const [people, setPeople] = useState(0);
  const [origin, setOrigin] = useState("");
  const [idle, setIdle] = useState(false);
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
      setRunState(saved ? { ...fresh(), ...(JSON.parse(saved) as Run) } : fresh());
    } catch {
      setRunState(fresh());
    }
  }, [load, storeKey]);

  const survey = useMemo(() => (data ? buildSurvey(data.form, data.questions) : null), [data]);
  const tafelQs = useMemo(() => survey?.questions.filter((q) => q.settings.tafel) ?? [], [survey]);
  const total = tafelQs.length;

  const command = useCallback(
    (c: TafelCommand) =>
      setRunState((r) => {
        if (!r) return r;
        const next = apply(r, c, total);
        try {
          localStorage.setItem(storeKey, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [total, storeKey]
  );
  const commandRef = useRef(command);
  commandRef.current = command;

  // Verbindung zu Handys und Steuerung
  useEffect(() => {
    if (!data) return;
    host.current = hostTafel(data.form.id, setPeople, (c) => commandRef.current(c));
    return () => host.current?.close();
  }, [data]);
  const current = run?.phase === "question" ? tafelQs[Math.min(run.index, total - 1)] : undefined;
  useEffect(() => {
    if (!run) return;
    const phase = current ? "question" : run.phase === "question" ? "lobby" : run.phase;
    host.current?.publish({ phase, questionId: current?.id ?? null, index: run.index, show: run.show, view: run.view, since: run.since });
  }, [run, current, data]);

  const answers = useTafelAnswers(data?.form.id ?? null, current?.id ?? null, run?.since);

  // Presenter-Klicker und Tastatur: → / Leertaste weiter, ← zurück, Z zeigen, K Karten/Wolke
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      const k = e.key;
      if (["ArrowRight", "PageDown", " "].includes(k)) command({ cmd: "next" });
      else if (["ArrowLeft", "PageUp"].includes(k)) command({ cmd: "back" });
      else if (k.toLowerCase() === "z") command({ cmd: "show" });
      else if (k.toLowerCase() === "k") command({ cmd: "view", view: run?.view === "karten" ? "wolke" : "karten" });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [command, run?.view]);

  // Steuerung ausblenden, wenn die Maus ruht
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("touchstart", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("touchstart", wake);
    };
  }, []);

  if (!data || !survey || !run) return <PageState error={error} onRetry={load} />;
  if (isTrashed(data.form)) return <PageState error={new Error("Dieser Bogen liegt im Papierkorb.")} />;
  const { form } = data;
  const slug = form.public_slug ?? form.id;
  const url = `${origin}/f/${slug}`;
  const rest = survey.questions.length - total;

  async function goLive() {
    await setFormStatus(form.id, "published");
    load();
  }

  let center: React.ReactNode;
  if (!total) {
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
          <p>Scan den Code. Die {total === 1 ? "erste Frage beantworten" : `ersten ${total} Fragen beantworten`} wir alle gemeinsam.</p>
          <p className={styles.url}>{origin && url.replace(/^https?:\/\//, "")}</p>
          {form.status !== "published" && (
            <p className={styles.warn}>
              Der Bogen ist {form.status === "draft" ? "noch nicht live" : "geschlossen"} – so kann niemand mitmachen.
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
        <p className={styles.count}>{rest > 0 ? `Jetzt geht's allein weiter: noch ${rest === 1 ? "1 Frage" : `${rest} Fragen`} auf dem Handy.` : "Ihr seid fertig."}</p>
      </div>
    );
  } else {
    const n = answerCount(answers);
    center = (
      <div className={styles.center}>
        <h2 className={styles.question} data-tafel-question>{survey.labelOf(current)}</h2>
        <p className={styles.count} data-count={n}><strong>{n}</strong> {n === 1 ? "Antwort" : "Antworten"}</p>
        {run.show ? <TafelResult question={current} answers={answers} view={run.view} /> : <p className={styles.hidden}>Ergebnis erscheint auf „Zeigen“.</p>}
      </div>
    );
  }

  const isQuestion = run.phase === "question" && current;
  return (
    <main className={`${styles.page} ${idle ? styles.idle : ""}`}>
      <div className={styles.top}>
        <h1 className={styles.title}>{form.title}</h1>
        <span className={styles.people} data-people={people}>{people} {people === 1 ? "Handy" : "Handys"} dabei</span>
      </div>
      {center}
      <div className={styles.controls}>
        <div className={styles.group}>
          <Link className="btn ghost" href={`/b/${form.id}/tafel/steuerung`}><Icon name="back" size={18} /> Steuerung</Link>
          {run.phase !== "lobby" && <button type="button" className="btn" onClick={() => command({ cmd: "back" })} data-tafel-back>Zurück</button>}
        </div>
        <span className={styles.step}>{isQuestion ? `Frage ${run.index + 1} von ${total}` : run.phase === "lobby" ? "Warten, bis alle drin sind" : ""}</span>
        <div className={styles.group}>
          {isQuestion && !isAnswerable(current) && (
            <button type="button" className="btn" onClick={() => command({ cmd: "view", view: run.view === "karten" ? "wolke" : "karten" })} data-tafel-view>
              {run.view === "karten" ? "Als Wolke" : "Als Karten"}
            </button>
          )}
          {isQuestion && <button type="button" className="btn big" onClick={() => command({ cmd: "show" })} data-tafel-show>{run.show ? "Verbergen" : "Zeigen"}</button>}
          {run.phase === "end" ? (
            <button type="button" className="btn big" onClick={() => command({ cmd: "restart" })} data-tafel-restart><Icon name="restart" size={18} /> Neu starten</button>
          ) : (
            total > 0 && (
              <button type="button" className="btn primary big" onClick={() => command({ cmd: "next" })} data-tafel-next>
                {nextLabel(run.phase, run.index, total)} →
              </button>
            )
          )}
        </div>
      </div>
    </main>
  );
}

