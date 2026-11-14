import { plural } from "@/brand/copy";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { distribution, typeOf } from "@/question-types";
import { Answer, AnswerValue, Question } from "@/lib/types";
import { Survey } from "./context";
import styles from "./survey.module.css";

interface Props {
  survey: Survey;
  question: Question;
  own: AnswerValue | undefined;
  answers: Answer[];
}

/** Inhaltszone eines Ergebnis-Screens: eigene Antwort im Vergleich zu allen anderen, in der Antwort-Box. Nur Anteile. */
export function ResultView({ survey, question, own, answers }: Props) {
  const { copy } = survey;
  const def = typeOf(question);
  const { rows, total } = distribution(question, answers);
  const matches = def.matches ?? ((v: AnswerValue, o: { value: unknown }) => v === o.value);
  const isOwn = (value: string | number | boolean) => own !== undefined && own !== null && matches(own, { value, label: "", short: "" });
  const ownShorts = rows.filter((r) => isOwn(r.option.value)).map((r) => r.option.short);

  return (
    <AnswerCard>
      <p className={styles.yourAnswer}>
        {copy.result.mine} = {ownShorts.length ? ownShorts.join(", ") : "–"}
        <span className={styles.total}> · {plural(total, copy.result.answers)}</span>
      </p>
      <div className={styles.rows}>
        {rows.map(({ option, share }) => {
          const mine = isOwn(option.value);
          return (
            <div key={String(option.value)} className={styles.row}>
              <span className={mine ? styles.own : undefined}>{option.short}</span>
              <div>
                <div className={styles.bar}>
                  <div className={styles.barFill} style={{ width: `${share * 100}%` }} />
                </div>
                {option.label !== option.short && <p className={styles.rowCaption}>{option.label}</p>}
              </div>
              <span className={`${styles.pct} ${mine ? styles.own : ""}`}>{Math.round(share * 100)} %</span>
            </div>
          );
        })}
      </div>
    </AnswerCard>
  );
}
