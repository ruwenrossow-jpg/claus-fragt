"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { plural } from "@/brand/copy";
import { Intro, MiniStage, StageProps, Stage } from "@/components/ui/Mascot";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { PillButton, PillSpacer } from "@/components/ui/PillButton";
import { Screen } from "@/components/ui/Screen";
import { TopBar } from "@/components/ui/TopBar";
import { TafelState } from "@/lib/tafel";
import { Answer, AnswerValue, Form, Question, isEmptyAnswer } from "@/lib/types";
import { boxTitleOf, isAnswerable, isInfo, typeOf } from "@/question-types";
import { buildSurvey } from "./context";
import { START, Step, nextStep, prevStep, progressOf } from "./flow";
import { ResultView } from "./ResultView";
import styles from "./survey.module.css";

export interface SurveyPlayerProps {
  form: Form;
  questions: Question[];
  /** Speichert die Antworten (live). Fehlt = Vorschau, es wird nichts gespeichert. */
  onSave?: (values: Record<string, AnswerValue>) => Promise<void>;
  /** Lädt die Antworten aller zu diesen (auswertbaren) Fragen für die Ergebnis-Screens (live). */
  loadAnswers?: (questionIds: string[]) => Promise<Answer[]>;
  /** Von außen gesteuerter Screen (Builder-Vorschau). */
  step?: Step;
  onStepChange?: (step: Step) => void;
  /** Stand der Tafel (Menti-Modus, nur Live-Link). null/fehlt = keine Tafel aktiv → alle Fragen wie gewohnt. */
  tafel?: TafelState | null;
  /** „Schließen“ auf dem Fertig-Screen (Builder-Vorschau: von vorne). Fehlt = Fenster schließen bzw. Tschüss-Screen. */
  onExit?: () => void;
}

const DOUBLE_TAP_MS = 400;

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
export function SurveyPlayer({ form, questions: allQuestions, onSave, loadAnswers, step: controlledStep, onStepChange, tafel, onExit }: SurveyPlayerProps) {
  const survey = useMemo(() => buildSurvey(form, allQuestions), [form, allQuestions]);
  const { theme, copy } = survey;
  const tafelQs = survey.questions.filter((q) => q.settings.tafel);
  /** Tafel läuft gerade (Lobby oder Frage) → nach dem Start geht es in den gemeinsamen Teil */
  const tafelLive = Boolean(onSave && tafel && tafel.phase !== "end" && tafelQs.length);
  /** Nach dem gemeinsamen Teil: ids der Fragen, die noch allein kommen. null = Bogen läuft ohne Tafel. */
  const [individual, setIndividual] = useState<string[] | null>(null);
  /** Tafel: schon abgeschickte Fragen; editing = abgeschickte Frage wird gerade geändert */
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const questions = individual ? survey.questions.filter((q) => individual.includes(q.id)) : survey.questions;
  const [ownStep, setOwnStep] = useState<Step>(START);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  /** Sperre gegen Doppelklick: greift sofort, nicht erst nach dem nächsten Render */
  const running = useRef(false);
  /** Zeitpunkt des letzten Screen-Wechsels: ein Doppeltipp auf WEITER! überspringt sonst die nächste Frage */
  const changedAt = useRef(0);
  const [note, setNote] = useState<string | null>(null);

  const step = controlledStep ?? ownStep;
  const resultQuestions = survey.questions.filter(isAnswerable);
  const n = questions.length;

  const go = (s: Step) => {
    changedAt.current = performance.now();
    setNote(null);
    if (onStepChange) onStepChange(s);
    else setOwnStep(s);
  };
  const next = () => go(step.kind === "start" && tafelLive ? { kind: "tafel" } : nextStep(step, n, resultQuestions.length));
  const back = prevStep(step, n, resultQuestions.length, individual !== null);
  // Neue Tafel-Frage: alten Hinweis (z. B. „Bitte beantworte …“) wegräumen
  const tafelKey = `${tafel?.phase}-${tafel?.questionId}`;
  useEffect(() => setNote(null), [tafelKey]);

  /** Speichern/Laden mit Sperre: ein zweiter Klick während der Arbeit tut nichts; bei Fehler bleibt der Screen, Hinweis über dem Button. */
  async function run(task: () => Promise<void>, failure: string, then: () => void = next) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setNote(null);
    try {
      await task();
      then();
    } catch {
      setNote(failure);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  /** Weiter von einer Frage: Pflicht prüfen, nach der letzten Frage speichern. */
  function leaveQuestion(index: number) {
    const q = questions[index];
    if (q.required && isEmptyAnswer(values[q.id])) return setNote(copy.hints.required);
    if (index === n - 1 && onSave) return run(() => onSave(values), copy.errors.save);
    if (!running.current) next();
  }

  /** Tafel: Antwort abschicken (speichert die ganze Abgabe, idempotent) → „Angekommen“. */
  function sendTafel(q: Question) {
    if (q.required && isEmptyAnswer(values[q.id])) return setNote(copy.hints.required);
    const done = () => {
      setSent((s) => ({ ...s, [q.id]: true }));
      setEditing(null);
    };
    if (onSave) run(() => onSave(values), copy.errors.save, done);
    else done();
  }

  /** Gemeinsamer Teil vorbei → allein weiter mit den übrigen Fragen (+ verpassten Pflichtfragen der Tafel). */
  function leaveTafel() {
    const rest = survey.questions.filter((q) => !q.settings.tafel || (q.required && isEmptyAnswer(values[q.id]))).map((q) => q.id);
    setIndividual(rest);
    if (rest.length) return go({ kind: "question", index: 0 });
    if (onSave) run(() => onSave(values), copy.errors.save, () => go({ kind: "over" }));
    else go({ kind: "over" });
  }

  function exit() {
    if (onExit) return onExit();
    window.close(); // klappt nur bei Fenstern, die per Skript geöffnet wurden – sonst bleibt der Tschüss-Screen
    go({ kind: "bye" });
  }

  const progressLabel = (i: number) => {
    if (i === n - 1 && n > 1) return copy.progress.last;
    if (i === 0) return copy.progress.first;
    if (n >= 4 && i === Math.floor(n / 2)) return copy.progress.half;
    return "";
  };
  const topBar = (label?: string) => (
    <TopBar onBack={back && !busy ? () => go(back) : undefined} backLabel={copy.buttons.back} progress={progressOf(step, n)} label={label} progressLabel={copy.aria.progress} />
  );

  function questionBody(q: Question) {
    const def = typeOf(q);
    return (
      <>
        <AnswerCard title={boxTitleOf(q)} label={survey.labelOf(q)}>
          <def.Input question={q} label={survey.labelOf(q)} copy={copy} value={values[q.id]} onChange={(v) => { setValues((vs) => ({ ...vs, [q.id]: v })); setNote(null); }} />
        </AnswerCard>
        {q.settings.maxChoices && <p className={styles.hint}>{copy.hints.maxChoices.replace("{max}", String(q.settings.maxChoices))}</p>}
      </>
    );
  }

  function parts(): Parts | null {
    // Live-Link: geschlossene Bögen und Entwürfe nehmen keine Antworten an (Vorschau im Builder zeigt immer den Bogen)
    if (onSave && form.status !== "published") {
      const msg = form.status === "closed" ? copy.closed : copy.draft;
      return { stage: { mood: "sad", side: "center", text: msg.title }, body: <Intro sub={msg.sub} /> };
    }
    switch (step.kind) {
      case "start":
        return {
          header: <TopBar />,
          stage: { mood: "happy", side: "center", text: survey.fill(copy.start.claus) },
          body: <Intro title={survey.fill(copy.start.title)} sub={form.description?.trim() || survey.fill(copy.start.sub)} tags={copy.start.chips.map(survey.fill)} />,
          button: { label: copy.start.button, onClick: next, disabled: !n },
        };

      case "tafel": {
        // Moderation weg oder gemeinsamer Teil beendet → WEITER! (kein Auto-Weiter)
        if (!tafel || tafel.phase === "end") {
          const rest = survey.questions.filter((q) => !q.settings.tafel || (q.required && isEmptyAnswer(values[q.id]))).length;
          return {
            header: <TopBar />,
            stage: { mood: "happy", side: "center", text: copy.tafel.over },
            body: <Intro sub={rest ? copy.tafel.overSub.replace("{rest}", plural(rest, ["Frage", "Fragen"])) : copy.tafel.overSubNone} />,
            button: { label: busy ? copy.buttons.busy : copy.buttons.next, onClick: leaveTafel, disabled: busy },
          };
        }
        const i = tafelQs.findIndex((q) => q.id === tafel.questionId);
        const q = tafelQs[i];
        if (tafel.phase !== "question" || !q) {
          return { header: <TopBar />, stage: { mood: "happy", side: "center", text: copy.tafel.wait }, body: <Intro sub={copy.tafel.waitSub} /> };
        }
        if (sent[q.id] && editing !== q.id) {
          return {
            header: <TopBar />,
            stage: { mood: "happy", side: i % 2 === 0 ? "right" : "left", text: copy.tafel.sent },
            body: <Intro sub={copy.tafel.sentSub} />,
            button: { label: copy.buttons.change, onClick: () => setEditing(q.id) },
          };
        }
        return {
          header: <TopBar />,
          stage: { mood: "happy", side: i % 2 === 0 ? "left" : "right", text: survey.labelOf(q), help: !q.required ? copy.hints.optional : q.help_text },
          body: questionBody(q),
          button: { label: busy ? copy.buttons.busy : copy.buttons.send, onClick: () => sendTafel(q), disabled: busy },
        };
      }

      case "question": {
        const q = questions[step.index];
        if (!q) return null;
        // Zwischenfolie: Claus sagt die Überschrift, keine Antwort-Box
        if (isInfo(q)) {
          return {
            header: topBar(progressLabel(step.index)),
            stage: { mood: "happy", side: "center", text: survey.labelOf(q), help: q.help_text },
            body: <Intro />,
            button: { label: busy ? copy.buttons.busy : copy.buttons.next, onClick: () => leaveQuestion(step.index), disabled: busy },
          };
        }
        const help = [q.help_text, !q.required ? copy.hints.optional : null].filter(Boolean).join(" · ");
        return {
          header: topBar(progressLabel(step.index)),
          stage: { mood: "happy", side: step.index % 2 === 0 ? "left" : "right", text: survey.labelOf(q), help },
          body: questionBody(q),
          button: { label: busy ? copy.buttons.busy : copy.buttons.next, onClick: () => leaveQuestion(step.index), disabled: busy },
        };
      }

      case "over": {
        const hasResults = resultQuestions.length > 0;
        return {
          header: topBar(),
          stage: { mood: "sad", side: "center", text: copy.end.claus },
          body: <Intro title={copy.end.title} />,
          button: {
            label: busy ? copy.buttons.busy : hasResults ? copy.buttons.result : copy.buttons.finish,
            disabled: busy,
            onClick: () => run(async () => { if (hasResults && loadAnswers) setAnswers(await loadAnswers(resultQuestions.map((x) => x.id))); }, copy.errors.results),
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
          stage: { mood: "happy", side: step.index % 2 === 0 ? "right" : "left", text: survey.labelOf(q), help: `${copy.result.title} · ${copy.result.question.replace("{n}", String(questions.indexOf(q) + 1))}` },
          body: <ResultView survey={survey} question={q} own={values[q.id]} answers={shown} />,
          button: { label: step.index === resultQuestions.length - 1 ? copy.buttons.finish : copy.buttons.next, onClick: next },
        };
      }

      case "done":
        return { header: topBar(), stage: { mood: "happy", side: "center", text: copy.thanks.title }, body: <Intro sub={copy.thanks.sub} />, button: { label: copy.buttons.close, onClick: exit } };

      case "bye":
        return { header: topBar(), stage: { mood: "happy", side: "center", text: copy.bye.title }, body: <Intro sub={copy.bye.sub} /> };
    }
  }

  /** Klicks kurz nach einem Screen-Wechsel ignorieren (zweiter Tipp eines Doppeltipps) */
  const guarded = (fn: () => void) => () => {
    if (performance.now() - changedAt.current > DOUBLE_TAP_MS) fn();
  };
  const p = parts();
  if (!p) return null;
  return (
    <Screen
      header={p.header ?? <TopBar />}
      stage={<Stage theme={theme} {...p.stage} />}
      typingStage={<MiniStage theme={theme} text={p.stage.text} />}
      footer={p.button ? <PillButton onClick={guarded(p.button.onClick)} disabled={p.button.disabled}>{p.button.label}</PillButton> : <PillSpacer />}
      note={note}
      bodyKey={"index" in step ? `${step.kind}-${step.index}` : step.kind === "tafel" ? `tafel-${tafelKey}-${sent[tafel?.questionId ?? ""] && editing !== tafel?.questionId}` : step.kind}
    >
      {p.body}
    </Screen>
  );
}
