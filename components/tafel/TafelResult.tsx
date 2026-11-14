"use client";

import { useEffect, useState } from "react";
import { loadAnswersSince } from "@/lib/data";
import { TafelView } from "@/lib/tafel";
import { Answer, Question } from "@/lib/types";
import { cloudWords } from "@/lib/wordcloud";
import { distribution, isAnswerable, typeOf } from "@/question-types";
import { WordCloud } from "./WordCloud";
import styles from "./tafel.module.css";

const POLL_MS = 2000;

/** Antworten einer Tafel-Frage, alle 2 s neu geladen (nur Abgaben ab `since`). */
export function useTafelAnswers(formId: string | null, questionId: string | null, since: string | undefined): Answer[] {
  const [answers, setAnswers] = useState<Answer[]>([]);
  useEffect(() => {
    setAnswers([]);
    if (!formId || !questionId || !since) return;
    let alive = true;
    const tick = () => loadAnswersSince(formId, [questionId], since).then((a) => alive && setAnswers(a), () => {});
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [formId, questionId, since]);
  return answers;
}

/** Anzahl Personen, die geantwortet haben */
export const answerCount = (answers: Answer[]) => new Set(answers.map((a) => a.response_id)).size;

/** Freitext → Wortwolke oder Karten; Auswahl, Sterne, Skala, Ja/Nein → Balken. `compact` = kleinere Darstellung (Steuerung). */
export function TafelResult({ question, answers, view = "wolke", compact = false }: { question: Question; answers: Answer[]; view?: TafelView; compact?: boolean }) {
  if (!isAnswerable(question)) {
    const items = answers.map((a) => ({ id: a.response_id, text: typeOf(question).format(question, a.value).trim() })).filter((x) => x.text);
    if (view === "karten") return <Cards items={items} compact={compact} />;
    return <WordCloud words={cloudWords(items.map((x) => x.text))} compact={compact} />;
  }
  const { rows } = distribution(question, answers);
  return (
    <div className={`${styles.bars} ${compact ? styles.compact : ""}`} data-bars>
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

/** Karten wie bei Menti: jede Antwort als Zettel, leicht schräg, fliegt beim Erscheinen an die Tafel. */
function Cards({ items, compact }: { items: { id: string; text: string }[]; compact: boolean }) {
  if (!items.length) return null;
  return (
    <div className={`${styles.cards} ${compact ? styles.compact : ""}`} data-cards>
      {items.map((x, i) => {
        // feste, aber verschiedene Schräglage je Abgabe (aus der id), damit beim Neuladen nichts wackelt
        const tilt = ((parseInt(x.id.slice(0, 2), 16) % 7) - 3) * 0.8;
        return (
          <p key={x.id} className={`${styles.card} ${styles[`tone${(i % 4) + 1}Bg`]}`} style={{ "--tilt": `${tilt}deg` } as React.CSSProperties} data-card>
            {x.text}
          </p>
        );
      })}
    </div>
  );
}
