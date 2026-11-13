/* eslint-disable @next/next/no-img-element */
import { TopBar } from "@/components/ui/TopBar";
import { distribution, typeOf } from "@/question-types";
import { Answer, AnswerValue, Question } from "@/lib/types";
import { Survey } from "./context";
import styles from "./survey.module.css";

interface Props {
  survey: Survey;
  question: Question;
  number: number;
  own: AnswerValue | undefined;
  answers: Answer[];
  onBack?: () => void;
}

/** Ergebnis-Screen: eigene Antwort im Vergleich zu allen anderen. Nur Anteile, keine Einzelantworten. */
export function ResultView({ survey, question, number, own, answers, onBack }: Props) {
  const { theme, copy } = survey;
  const def = typeOf(question);
  const { rows, total } = distribution(question, answers);
  const matches = def.matches ?? ((v: AnswerValue, o: { value: unknown }) => v === o.value);
  const isOwn = (value: string | number | boolean) => own !== undefined && own !== null && matches(own, { value, label: "", short: "" });
  const ownShorts = rows.filter((r) => isOwn(r.option.value)).map((r) => r.option.short);

  return (
    <>
      <div className={styles.resultHead}>
        <TopBar onBack={onBack} backLabel={copy.buttons.back} />
        <img className={styles.resultMascot} src={theme.mascot.happy} alt={theme.mascot.alt} />
      </div>
      <p className={styles.resultKicker}>{copy.result.title}</p>
      <h2 className={styles.resultTitle}>
        Frage {number}
        <br />
        {survey.labelOf(question)}
      </h2>
      <p className={styles.yourAnswer}>
        {copy.result.mine} = {ownShorts.length ? ownShorts.join(", ") : "–"}
        <span className={styles.total}> · {total} Antworten</span>
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
