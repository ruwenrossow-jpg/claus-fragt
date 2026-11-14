"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/admin/icons";
import { PageState } from "@/components/admin/PageState";
import { QrCode } from "@/components/QrCode";
import { buildSurvey } from "@/components/survey/context";
import { TafelResult, answerCount, useTafelAnswers } from "@/components/tafel/TafelResult";
import { useTafel } from "@/components/tafel/useTafel";
import styles from "@/components/tafel/tafel.module.css";
import { loadForm, setFormStatus } from "@/lib/data";
import { nextLabel } from "@/lib/tafel";
import { Form, Question, isTrashed } from "@/lib/types";
import { isAnswerable } from "@/question-types";

const IDLE_MS = 3000;

/**
 * Beamer (Tafel) wie bei Menti: Lobby mit QR → Frage für alle → Zähler → „Zeigen“ → Wortwolke/Karten/Balken → … → Ende.
 * Hält als Host den Stand (lib/tafel.ts); ein zweites Beamer-Fenster spiegelt nur und schickt Befehle an den Host.
 */
export default function TafelPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ form: Form; questions: Question[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [origin, setOrigin] = useState("");
  const [idle, setIdle] = useState(false);

  const load = useCallback(() => {
    setError(null);
    loadForm(id).then(setData, setError);
  }, [id]);
  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  const survey = useMemo(() => (data ? buildSurvey(data.form, data.questions) : null), [data]);
  const tafelQs = useMemo(() => survey?.questions.filter((q) => q.settings.tafel) ?? [], [survey]);
  const total = tafelQs.length;
  const ids = useMemo(() => tafelQs.map((q) => q.id), [tafelQs]);
  const { run, people, command } = useTafel(data?.form.id ?? null, "beamer", ids);
  const current = run?.phase === "question" ? tafelQs[Math.min(run.index, total - 1)] : undefined;
  const answers = useTafelAnswers(data?.form.id ?? null, current?.id ?? null, run?.since);

  // Presenter-Klicker und Tastatur: → / Leertaste weiter, ← zurück, Z zeigen, K Karten/Wolke
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t?.closest("input, textarea") || (e.key === " " && t?.closest("button, a"))) return;
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

  // Bedienleiste ausblenden, wenn die Maus ruht
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

  if (!data || !survey) return <PageState error={error} onRetry={load} />;
  if (isTrashed(data.form)) return <PageState error={new Error("Dieser Bogen liegt im Papierkorb.")} />;
  const { form } = data;
  const slug = form.public_slug ?? form.id;
  const url = `${origin}/f/${slug}`;
  const shortUrl = url.replace(/^https?:\/\//, "");
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
  } else if (!run) {
    center = <div className={styles.center}><p className={styles.hidden}>Verbinde …</p></div>;
  } else if (run.phase === "lobby") {
    center = (
      <div className={styles.lobby}>
        <div>
          <h2>Handy raus und mitmachen!</h2>
          <p>Scan den Code. Die {total === 1 ? "erste Frage beantworten" : `ersten ${total} Fragen beantworten`} wir alle gemeinsam.</p>
          <p className={styles.url}>{origin && shortUrl}</p>
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
    const countText = <><strong>{n}</strong> {n === 1 ? "Antwort" : "Antworten"}</>;
    let result: React.ReactNode;
    if (!n) {
      // Zustand selbsterklärend: Ohne Antworten gibt es nichts zu zeigen → wie man mitmacht
      result = (
        <div className={styles.empty} data-tafel-empty>
          {origin && <QrCode text={url} size={240} className={styles.emptyQr} />}
          <div>
            <p className={styles.emptyTitle}>Noch keine Antworten.</p>
            <p className={styles.emptySub}>Handy raus, QR-Code scannen, „Los geht's“ tippen – dann erscheint die Frage auf dem Handy.</p>
            <p className={styles.url}>{shortUrl}</p>
          </div>
        </div>
      );
    } else if (run.show) {
      result = <TafelResult question={current} answers={answers} view={run.view} />;
    } else {
      result = (
        <div className={styles.waiting}>
          <p className={styles.bigCount} data-count={n}>{countText}</p>
          <p className={styles.hidden}>Erscheinen auf „Zeigen“.</p>
        </div>
      );
    }
    center = (
      <div className={styles.questionStage}>
        <div className={styles.questionHead}>
          <h2 className={styles.question} data-tafel-question>{survey.labelOf(current)}</h2>
          {run.show && n > 0 && <p className={styles.count} data-count={n}>{countText}</p>}
        </div>
        <div className={styles.result} data-tafel-result>{result}</div>
      </div>
    );
  }

  const isQuestion = run?.phase === "question" && current;
  return (
    <main className={`${styles.page} ${idle ? styles.idle : ""}`}>
      <div className={styles.top}>
        <h1 className={styles.title}>{form.title}</h1>
        {isQuestion && origin && <span className={styles.join}>Mitmachen: <strong>{shortUrl}</strong></span>}
        <span className={styles.people} data-people={people}>{people} {people === 1 ? "Handy" : "Handys"} dabei</span>
      </div>
      {center}
      {run && total > 0 && (
        <nav className={styles.controls} aria-label="Tafel steuern">
          <div className={styles.group}>
            <button type="button" className="btn" disabled={run.phase === "lobby"} onClick={() => command({ cmd: "back" })} data-tafel-back>
              <Icon name="back" size={18} /> Zurück
            </button>
            <Link className={`btn ghost ${styles.toRemote}`} href={`/b/${form.id}/tafel/steuerung`}>Steuerung</Link>
          </div>
          <span className={styles.step}>{isQuestion ? `Frage ${run.index + 1} von ${total}` : run.phase === "lobby" ? "Warten, bis alle drin sind" : ""}</span>
          <div className={styles.group}>
            {isQuestion && !isAnswerable(current) && (
              <button type="button" className="btn" onClick={() => command({ cmd: "view", view: run.view === "karten" ? "wolke" : "karten" })} data-tafel-view>
                {run.view === "karten" ? "Als Wolke" : "Als Karten"}
              </button>
            )}
            {isQuestion && <button type="button" className="btn" onClick={() => command({ cmd: "show" })} data-tafel-show>{run.show ? "Verbergen" : "Zeigen"}</button>}
            {run.phase === "end" ? (
              <button type="button" className="btn" onClick={() => command({ cmd: "restart" })} data-tafel-restart><Icon name="restart" size={18} /> Neu starten</button>
            ) : (
              <button type="button" className="btn primary" onClick={() => command({ cmd: "next" })} data-tafel-next>
                {nextLabel(run.phase, run.index, total)} →
              </button>
            )}
          </div>
        </nav>
      )}
    </main>
  );
}
