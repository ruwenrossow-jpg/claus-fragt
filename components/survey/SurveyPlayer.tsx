"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Intro, MascotHero } from "@/components/ui/Mascot";
import { PillButton } from "@/components/ui/PillButton";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/ui/TopBar";
import { Answer, AnswerValue, Form, Question, isEmptyAnswer } from "@/lib/types";
import { isAnswerable, typeOf } from "@/question-types";
import { buildSurvey } from "./context";
import { START, Step, nextStep, prevStep, progressOf } from "./flow";
import { QuestionScreen } from "./QuestionScreen";
import { ResultView } from "./ResultView";
import styles from "./survey.module.css";

const AUTO_ADVANCE_MS = 400;

export interface SurveyPlayerProps {
  form: Form;
  questions: Question[];
  /** Speichert die Antworten (live). Fehlt = Vorschau, es wird nichts gespeichert. */
  onSave?: (values: Record<string, AnswerValue>) => Promise<void>;
  /** Lädt die Antworten aller für die Ergebnis-Screens (live). */
  loadAnswers?: () => Promise<Answer[]>;
  /** Von außen gesteuerter Screen (Builder-Vorschau). */
  step?: Step;
  onStepChange?: (step: Step) => void;
}

/** Spielt einen Bogen ab. Wird vom Teilnehmer-Link UND von der Builder-Vorschau genutzt. */
export function SurveyPlayer({ form, questions: allQuestions, onSave, loadAnswers, step: controlledStep, onStepChange }: SurveyPlayerProps) {
  const survey = useMemo(() => buildSurvey(form, allQuestions), [form, allQuestions]);
  const { theme, copy, questions } = survey;
  const [ownStep, setOwnStep] = useState<Step>(START);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const step = controlledStep ?? ownStep;
  const resultQuestions = questions.filter(isAnswerable);
  const n = questions.length;

  const go = (s: Step) => {
    clearTimeout(timer.current);
    setHint(null);
    setError(null);
    if (onStepChange) onStepChange(s);
    else setOwnStep(s);
  };
  const next = () => go(nextStep(step, n, resultQuestions.length));
  const back = prevStep(step, n);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      next();
    } catch (e) {
      setError((e as Error).message || "Da ist etwas schiefgelaufen. Bitte nochmal versuchen.");
    } finally {
      setBusy(false);
    }
  }

  /** Weiter von einer Frage: Pflicht prüfen, nach der letzten Frage speichern. */
  function leaveQuestion(index: number, snapshot: Record<string, AnswerValue>) {
    const q = questions[index];
    if (q.required && isEmptyAnswer(snapshot[q.id])) return setHint(copy.hints.required);
    if (index === n - 1 && onSave) return run(() => onSave(snapshot));
    next();
  }

  function answer(q: Question, index: number, v: AnswerValue) {
    const snapshot = { ...values, [q.id]: v };
    setValues(snapshot);
    setHint(null);
    clearTimeout(timer.current);
    if (theme.autoAdvance && typeOf(q).autoAdvance && !isEmptyAnswer(v)) {
      timer.current = setTimeout(() => leaveQuestion(index, snapshot), AUTO_ADVANCE_MS);
    }
  }

  if (form.status === "closed" && onSave) {
    return (
      <Screen header={<TopBar />}>
        <MascotHero theme={theme} mood="sad" text={copy.closed.title} />
        <Intro sub={copy.closed.sub} />
      </Screen>
    );
  }

  const progressLabel = (i: number) => {
    if (i === n - 1) return copy.progress.last;
    if (n >= 4 && i === Math.floor(n / 2)) return copy.progress.half;
    return copy.steps[questions[i].step ?? 0] ?? "";
  };
  const header = (label?: string) => (
    <TopBar onBack={back ? () => go(back) : undefined} backLabel={copy.buttons.back} progress={progressOf(step, n)} label={label} />
  );

  switch (step.kind) {
    case "start":
      return (
        <Screen
          header={onSave && form.status === "draft" ? <p className={styles.notice}>Entwurf – noch nicht live</p> : <TopBar />}
          footer={<PillButton onClick={next} disabled={!n}>{copy.start.button}</PillButton>}
        >
          <MascotHero theme={theme} mood="happy" size="s" text={survey.fill(copy.start.claus)} />
          <Intro title={survey.fill(copy.start.title)} sub={survey.fill(copy.start.sub)} tags={copy.start.chips.map(survey.fill)} />
        </Screen>
      );

    case "question": {
      const q = questions[step.index];
      if (!q) return null;
      return (
        <QuestionScreen
          survey={survey}
          index={step.index}
          header={header(progressLabel(step.index))}
          value={values[q.id]}
          onAnswer={(v) => answer(q, step.index, v)}
          onNext={() => leaveQuestion(step.index, values)}
          busy={busy}
          hint={hint}
          error={error}
        />
      );
    }

    case "over": {
      const hasResults = resultQuestions.length > 0;
      const onNext = () =>
        run(async () => {
          if (hasResults && loadAnswers) setAnswers(await loadAnswers());
        });
      return (
        <Screen header={header()} footer={<PillButton onClick={onNext} disabled={busy}>{busy ? "…" : hasResults ? copy.buttons.result : copy.buttons.finish}</PillButton>}>
          <MascotHero theme={theme} mood="sad" size="s" text={copy.end.claus} />
          <Intro title={copy.end.title} />
          {error && <p className={styles.error}>{error}</p>}
        </Screen>
      );
    }

    case "result": {
      const q = resultQuestions[step.index];
      if (!q) return null;
      const isLast = step.index === resultQuestions.length - 1;
      // Vorschau ohne Datenbank: nur die eigenen Antworten
      const shown = loadAnswers ? answers : Object.entries(values).map(([question_id, value]) => ({ response_id: "preview", question_id, value }));
      return (
        <Screen footer={<PillButton onClick={next}>{isLast ? copy.buttons.finish : copy.buttons.next}</PillButton>}>
          <ResultView
            survey={survey}
            question={q}
            number={questions.indexOf(q) + 1}
            own={values[q.id]}
            answers={shown}
            onBack={back ? () => go(back) : undefined}
          />
        </Screen>
      );
    }

    case "done":
      return (
        <Screen header={<TopBar />}>
          <MascotHero theme={theme} mood="happy" text={copy.thanks.title} />
          <Intro sub={copy.thanks.sub} />
        </Screen>
      );
  }
}
