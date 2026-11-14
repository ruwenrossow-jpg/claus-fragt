import { Survey } from "./context";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { MascotCorner } from "@/components/ui/Mascot";
import { PillButton } from "@/components/ui/PillButton";
import { Screen } from "@/components/ui/Screen";
import { AnswerValue, Question } from "@/lib/types";
import { boxTitleOf, typeOf } from "@/question-types";
import styles from "./survey.module.css";

interface Props {
  survey: Survey;
  index: number;
  header: React.ReactNode;
  value: AnswerValue | undefined;
  onAnswer: (v: AnswerValue) => void;
  onNext: () => void;
  busy: boolean;
  hint: string | null;
  error: string | null;
}

/**
 * Ein Fragen-Screen: Claus (immer sichtbar, abwechselnd links/rechts), Frage in der Sprechblase, Antwort-Box, WEITER!.
 * Kein Auto-Weiter – man wählt aus und bestätigt selbst.
 */
export function QuestionScreen({ survey, index, header, value, onAnswer, onNext, busy, hint, error }: Props) {
  const { theme, copy, questions } = survey;
  const q: Question = questions[index];
  const def = typeOf(q);
  const help = [q.help_text, !q.required ? copy.hints.optional : null].filter(Boolean).join(" · ");

  return (
    <Screen header={header} footer={<PillButton onClick={onNext} disabled={busy}>{busy ? "…" : copy.buttons.next}</PillButton>}>
      <MascotCorner theme={theme} side={index % 2 === 0 ? "left" : "right"} text={survey.labelOf(q)} help={help} />
      <AnswerCard title={boxTitleOf(q)}>
        <def.Input question={q} value={value} onChange={onAnswer} />
      </AnswerCard>
      {q.settings.maxChoices && <p className={styles.hint}>{copy.hints.maxChoices.replace("{max}", String(q.settings.maxChoices))}</p>}
      {hint && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </Screen>
  );
}
