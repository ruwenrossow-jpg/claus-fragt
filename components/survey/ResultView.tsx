/* eslint-disable @next/next/no-img-element */
import { COPY } from "@/brand/copy";
import { Theme } from "@/brand/themes";
import { TopBar } from "@/components/ui/TopBar";
import { distribution, typeOf } from "@/question-types";
import { Answer, AnswerValue, Question } from "@/lib/types";
import styles from "./survey.module.css";

interface Props {
  theme: Theme;
  question: Question;
  number: number;
  own: AnswerValue | undefined;
  answers: Answer[];
  onBack?: () => void;
}

/** Ergebnis-Screen: eigene Antwort im Vergleich zu allen anderen (Prototyp „Results“). */
export function ResultView({ theme, question, number, own, answers, onBack }: Props) {
  const def = typeOf(question);
  const { rows } = distribution(question, answers);
  const matches = def.matches ?? ((v: AnswerValue, o: { value: unknown }) => v === o.value);
  const isOwn = (value: string | number | boolean) => own !== undefined && own !== null && matches(own, { value, label: "", short: "" });
  const ownShorts = rows.filter((r) => isOwn(r.option.value)).map((r) => r.option.short);

  return (
    <>
      <div className={styles.resultHead}>
        <TopBar onBack={onBack} />
        <img className={styles.resultMascot} src={theme.mascot.sad} alt={theme.mascot.alt} />
      </div>
      <h2 className={styles.resultTitle}>
        Frage {number}
        <br />
        {question.label}
      </h2>
      <p className={styles.yourAnswer}>
        {COPY.yourAnswer} = {ownShorts.length ? ownShorts.join(", ") : "–"}:
      </p>
      <div className={styles.rows}>
        {rows.map(({ option, share }) => {
          const mine = isOwn(option.value);
          return (
            <div key={String(option.value)} className={styles.row}>
              <span className={mine ? styles.own : undefined}>{option.short}:</span>
              <div className={styles.bar}>
                <div className={styles.barFill} style={{ width: `${share * 100}%` }} />
              </div>
              <span className={`${styles.pct} ${mine ? styles.own : ""}`}>{Math.round(share * 100)}%</span>
              {option.label !== option.short && <p className={styles.rowCaption}>{option.label}</p>}
            </div>
          );
        })}
      </div>
    </>
  );
}
