"use client";

import { useMemo, useState } from "react";
import { Intro, StageProps, Stage } from "@/components/ui/Mascot";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { PillButton, PillSpacer } from "@/components/ui/PillButton";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/ui/TopBar";
import { Answer, AnswerValue, Form, Question, isEmptyAnswer } from "@/lib/types";
import { boxTitleOf, isAnswerable, typeOf } from "@/question-types";
import { buildSurvey } from "./context";
import { START, Step, nextStep, prevStep, progressOf } from "./flow";
import { ResultView } from "./ResultView";
import styles from "./survey.module.css";

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

/** Was ein Screen in die Zonen des Rasters legt. */
interface Parts {
  header?: React.ReactNode;
  stage: Omit<StageProps, "theme">;
  body: React.ReactNode;
  button?: { label: string; onClick: () => void; disabled?: boolean };
}

/**
 * Spielt einen Bogen ab. Wird vom Teilnehmer-Link UND von der Builder-Vorschau genutzt.
 * Jeder Schritt liefert nur „Parts“; gerendert wird immer derselbe <Screen> mit derselben <Stage>.
 * Dadurch bleiben Zonen, Button und Claus-Element über alle Screens erhalten (feste Positionen, Claus wandert animiert).
 */
export function SurveyPlayer({ form, questions: allQuestions, onSave, loadAnswers, step: controlledStep, onStepChange }: SurveyPlayerProps) {
  const survey = useMemo(() => buildSurvey(form, allQuestions), [form, allQuestions]);
  const { theme, copy, questions } = survey;
  const [ownStep, setOwnStep] = useState<Step>(START);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const step = controlledStep ?? ownStep;
  const resultQuestions = questions.filter(isAnswerable);
  const n = questions.length;

  const go = (s: Step) => {
    setNote(null);
    if (onStepChange) onStepChange(s);
    else setOwnStep(s);
  };
  const next = () => go(nextStep(step, n, resultQuestions.length));
  const back = prevStep(step, n, resultQuestions.length);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setNote(null);
    try {
      await task();
      next();
    } catch (e) {
      setNote((e as Error).message || "Da ist etwas schiefgelaufen. Bitte nochmal versuchen.");
    } finally {
      setBusy(false);
    }
  }

  /** Weiter von einer Frage: Pflicht prüfen, nach der letzten Frage speichern. */
  function leaveQuestion(index: number) {
    const q = questions[index];
    if (q.required && isEmptyAnswer(values[q.id])) return setNote(copy.hints.required);
    if (index === n - 1 && onSave) return run(() => onSave(values));
    next();
  }

  const progressLabel = (i: number) => {
    if (i === n - 1 && n > 1) return copy.progress.last;
    if (i === 0) return copy.progress.first;
    if (n >= 4 && i === Math.floor(n / 2)) return copy.progress.half;
    return "";
  };
  const topBar = (label?: string) => (
    <TopBar onBack={back ? () => go(back) : undefined} backLabel={copy.buttons.back} progress={progressOf(step, n)} label={label} />
  );

  function parts(): Parts | null {
    if (form.status === "closed" && onSave) {
      return { stage: { mood: "sad", side: "center", text: copy.closed.title }, body: <Intro sub={copy.closed.sub} /> };
    }
    switch (step.kind) {
      case "start":
        return {
          header: <TopBar notice={onSave && form.status === "draft" ? "Entwurf – noch nicht live" : undefined} />,
          stage: { mood: "happy", side: "center", text: survey.fill(copy.start.claus) },
          body: <Intro title={survey.fill(copy.start.title)} sub={form.description?.trim() || survey.fill(copy.start.sub)} tags={copy.start.chips.map(survey.fill)} />,
          button: { label: copy.start.button, onClick: next, disabled: !n },
        };

      case "question": {
        const q = questions[step.index];
        if (!q) return null;
        const def = typeOf(q);
        const help = [q.help_text, !q.required ? copy.hints.optional : null].filter(Boolean).join(" · ");
        return {
          header: topBar(progressLabel(step.index)),
          stage: { mood: "happy", side: step.index % 2 === 0 ? "left" : "right", text: survey.labelOf(q), help },
          body: (
            <>
              <AnswerCard title={boxTitleOf(q)}>
                <def.Input question={q} value={values[q.id]} onChange={(v) => { setValues((vs) => ({ ...vs, [q.id]: v })); setNote(null); }} />
              </AnswerCard>
              {q.settings.maxChoices && <p className={styles.hint}>{copy.hints.maxChoices.replace("{max}", String(q.settings.maxChoices))}</p>}
            </>
          ),
          button: { label: busy ? "…" : copy.buttons.next, onClick: () => leaveQuestion(step.index), disabled: busy },
        };
      }

      case "over": {
        const hasResults = resultQuestions.length > 0;
        return {
          header: topBar(),
          stage: { mood: "sad", side: "center", text: copy.end.claus },
          body: <Intro title={copy.end.title} />,
          button: {
            label: busy ? "…" : hasResults ? copy.buttons.result : copy.buttons.finish,
            disabled: busy,
            onClick: () => run(async () => { if (hasResults && loadAnswers) setAnswers(await loadAnswers()); }),
          },
        };
      }

      case "result": {
        const q = resultQuestions[step.index];
        if (!q) return null;
        // Vorschau ohne Datenbank: nur die eigenen Antworten
        const shown = loadAnswers ? answers : Object.entries(values).map(([question_id, value]) => ({ response_id: "preview", question_id, value }));
        return {
          header: topBar(),
          stage: { mood: "happy", side: step.index % 2 === 0 ? "right" : "left", text: survey.labelOf(q), help: `${copy.result.title} · Frage ${questions.indexOf(q) + 1}` },
          body: <ResultView survey={survey} question={q} own={values[q.id]} answers={shown} />,
          button: { label: step.index === resultQuestions.length - 1 ? copy.buttons.finish : copy.buttons.next, onClick: next },
        };
      }

      case "done":
        return { header: topBar(), stage: { mood: "happy", side: "center", text: copy.thanks.title }, body: <Intro sub={copy.thanks.sub} /> };
    }
  }

  const p = parts();
  if (!p) return null;
  return (
    <Screen
      header={p.header ?? <TopBar />}
      stage={<Stage theme={theme} {...p.stage} />}
      footer={p.button ? <PillButton onClick={p.button.onClick} disabled={p.button.disabled}>{p.button.label}</PillButton> : <PillSpacer />}
      note={note}
      bodyKey={"index" in step ? `${step.kind}-${step.index}` : step.kind}
    >
      {p.body}
    </Screen>
  );
}
