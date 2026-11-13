"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { COPY, fillCopy } from "@/brand/copy";
import { getTheme } from "@/brand/themes";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { MascotCorner, MascotHero } from "@/components/ui/Mascot";
import { PillButton } from "@/components/ui/PillButton";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/ui/TopBar";
import { boxTitleOf, isAnswerable, typeOf } from "@/question-types";
import { Answer, AnswerValue, Form, Question, isEmptyAnswer } from "@/lib/types";
import { START, Step, nextStep, prevStep, progressOf } from "./flow";
import { ResultView } from "./ResultView";
import styles from "./survey.module.css";

export interface SurveyPlayerProps {
  form: Form;
  questions: Question[];
  /** Speichert die Antworten (live). Fehlt = Vorschau, es wird nichts gespeichert. */
  onSave?: (values: Record<string, AnswerValue>) => Promise<void>;
  /** Lädt alle Antworten des Bogens für die Ergebnis-Screens (live). */
  loadAnswers?: () => Promise<Answer[]>;
  /** Von außen gesteuerter Screen (Builder-Vorschau). */
  step?: Step;
  onStepChange?: (step: Step) => void;
}

/** Spielt einen Bogen im Prototyp-Look ab. Wird vom Teilnehmer-Link UND von der Builder-Vorschau genutzt. */
export function SurveyPlayer({ form, questions, onSave, loadAnswers, step: controlledStep, onStepChange }: SurveyPlayerProps) {
  const theme = getTheme(form.style);
  const [ownStep, setOwnStep] = useState<Step>(START);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const step = controlledStep ?? ownStep;
  // Vorschau ohne Datenbank: Ergebnis-Screens zeigen nur die eigenen Antworten
  const ownAnswers: Answer[] = Object.entries(values).map(([question_id, value]) => ({ response_id: "preview", question_id, value }));
  const resultQuestions = questions.filter(isAnswerable);
  const go = (s: Step) => {
    setShowHint(false);
    setError(null);
    if (onStepChange) onStepChange(s);
    else setOwnStep(s);
  };
  const next = () => go(nextStep(step, questions.length, resultQuestions.length));
  const back = prevStep(step, questions.length);
  const header = <TopBar onBack={back ? () => go(back) : undefined} progress={progressOf(step, questions.length)} />;

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

  if (form.status === "closed" && onSave) {
    return <Screen header={<TopBar />}><MascotHero theme={theme} mood="sad" text={COPY.closedBubble} /></Screen>;
  }

  switch (step.kind) {
    case "start":
      return (
        <Screen
          header={onSave && form.status === "draft" ? <p className={styles.notice}>Entwurf – noch nicht veröffentlicht</p> : <TopBar />}
          footer={<PillButton onClick={next} disabled={!questions.length}>{COPY.buttons.start}</PillButton>}
        >
          <MascotHero theme={theme} mood="happy" text={fillCopy(form.description?.trim() || COPY.startBubble, { anzahl: questions.length })} />
        </Screen>
      );

    case "question": {
      const q = questions[step.index];
      if (!q) return null;
      const def = typeOf(q);
      const side = q.settings.mascotSide && q.settings.mascotSide !== "auto" ? q.settings.mascotSide : step.index % 2 === 0 ? "left" : "right";
      const missing = q.required && isEmptyAnswer(values[q.id]);
      const isLast = step.index === questions.length - 1;
      const onNext = () => {
        if (missing) return setShowHint(true);
        if (isLast && onSave) return run(() => onSave(values));
        next();
      };
      return (
        <Screen header={header} footer={<PillButton onClick={onNext} disabled={busy}>{busy ? "…" : COPY.buttons.next}</PillButton>}>
          <MascotCorner theme={theme} side={side} text={q.label || "Hier könnte Ihre Frage stehen"} help={q.help_text} />
          <AnswerCard title={boxTitleOf(q)}>
            <def.Input question={q} value={values[q.id]} onChange={(v) => setValues((s) => ({ ...s, [q.id]: v }))} />
          </AnswerCard>
          {showHint && <p className={styles.hint}>{COPY.requiredHint}</p>}
          {error && <p className={styles.error}>{error}</p>}
        </Screen>
      );
    }

    case "over": {
      const hasResults = resultQuestions.length > 0;
      const onNext = () =>
        run(async () => {
          if (hasResults && loadAnswers) setAnswers(await loadAnswers());
        });
      return (
        <Screen header={header} footer={<PillButton onClick={onNext} disabled={busy}>{busy ? "…" : hasResults ? COPY.buttons.result : COPY.buttons.finish}</PillButton>}>
          <MascotHero theme={theme} mood="sad" text={COPY.overBubble} />
          {error && <p className={styles.error}>{error}</p>}
        </Screen>
      );
    }

    case "result": {
      const q = resultQuestions[step.index];
      if (!q) return null;
      const isLast = step.index === resultQuestions.length - 1;
      return (
        <Screen footer={<PillButton onClick={next}>{isLast ? COPY.buttons.finish : COPY.buttons.next}</PillButton>}>
          <ResultView
            theme={theme}
            question={q}
            number={questions.indexOf(q) + 1}
            own={values[q.id]}
            answers={loadAnswers ? answers : ownAnswers}
            onBack={back ? () => go(back) : undefined}
          />
        </Screen>
      );
    }

    case "done":
      return (
        <Screen header={<TopBar />}>
          <MascotHero theme={theme} mood="happy" text={COPY.doneBubble} />
        </Screen>
      );
  }
}
