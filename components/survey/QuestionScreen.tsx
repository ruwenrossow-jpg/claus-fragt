import { Survey } from "./context";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { MascotCorner, PlainPrompt } from "@/components/ui/Mascot";
import { PillButton } from "@/components/ui/PillButton";
import { Screen } from "@/components/ui/Screen";
import { TextButton } from "@/components/ui/TextButton";
import { AnswerValue, Question } from "@/lib/types";
import { boxTitleOf, typeOf } from "@/question-types";
import styles from "./survey.module.css";
import ui from "@/components/ui/ui.module.css";

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

/** Ein Fragen-Screen. Claus erscheint je nach Theme immer, nur am Bereichsanfang oder gar nicht. */
export function QuestionScreen({ survey, index, header, value, onAnswer, onNext, busy, hint, error }: Props) {
  const { theme, copy, questions } = survey;
  const q: Question = questions[index];
  const def = typeOf(q);
  const auto = theme.autoAdvance && def.autoAdvance;
  const help = [q.help_text, q.settings.kpi === "transfer" ? copy.hints.honest : null, !q.required ? copy.hints.optional : null].filter(Boolean).join(" · ");

  const stepStart = index === 0 || questions[index - 1].step !== q.step;
  const showMascot = theme.mascotOnQuestions === "always" || (theme.mascotOnQuestions === "stepStart" && stepStart);
  const side = q.settings.mascotSide && q.settings.mascotSide !== "auto" ? q.settings.mascotSide : index % 2 === 0 ? "left" : "right";
  const text = survey.labelOf(q);

  const footer = (
    <div className={ui.footerStack}>
      {!auto && <PillButton onClick={onNext} disabled={busy}>{busy ? "…" : copy.buttons.next}</PillButton>}
      {auto && busy && <p className={styles.hint}>…</p>}
      {auto && !q.required && !busy && <TextButton onClick={onNext}>{copy.buttons.skip}</TextButton>}
    </div>
  );

  return (
    <Screen header={header} footer={footer}>
      {showMascot ? <MascotCorner theme={theme} side={side} text={text} help={help} /> : <PlainPrompt text={text} help={help} />}
      <AnswerCard title={boxTitleOf(q)}>
        <def.Input question={q} value={value} onChange={onAnswer} />
      </AnswerCard>
      {q.settings.maxChoices && <p className={styles.hint}>{copy.hints.maxChoices.replace("{max}", String(q.settings.maxChoices))}</p>}
      {hint && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </Screen>
  );
}
