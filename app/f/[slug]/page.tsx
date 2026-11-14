"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { COPY_DEFAULT } from "@/brand/copy";
import { SurveyMessage } from "@/components/survey/SurveyMessage";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { DataError, loadAnswers, loadPublicForm, newResponseId, saveResponse } from "@/lib/data";
import { TafelState, joinTafel } from "@/lib/tafel";
import { AnswerValue, Form, Question, isTrashed } from "@/lib/types";

type State = { kind: "loading" } | { kind: "ready"; form: Form; questions: Question[] } | { kind: "gone" } | { kind: "offline" };

/** Öffentlicher Link zum Ausfüllen: /f/<slug>. Kein Login, keine personenbezogenen Daten. */
export default function FillPage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });
  // Eine Abgabe = eine feste id: erneutes Speichern (Doppelklick, Fehler, zurück + ändern) ersetzt statt zu verdoppeln
  const responseId = useRef(newResponseId());
  const [tafel, setTafel] = useState<TafelState | null>(null);
  // Tafel-Modus: nur Bögen mit Tafel-Fragen hören auf die Moderation
  const formId = state.kind === "ready" && state.form.status === "published" && state.questions.some((q) => q.settings?.tafel) ? state.form.id : null;
  useEffect(() => (formId ? joinTafel(formId, setTafel) : undefined), [formId]);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    loadPublicForm(slug).then(
      (d) => !cancelled && setState(isTrashed(d.form) ? { kind: "gone" } : { kind: "ready", ...d }),
      (e) => !cancelled && setState({ kind: e instanceof DataError && e.kind === "not_found" ? "gone" : "offline" })
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);
  useEffect(load, [load]);

  const copy = COPY_DEFAULT;
  if (state.kind === "loading") return <SurveyMessage mood="happy" title={copy.loading} />;
  if (state.kind === "gone") return <SurveyMessage title={copy.gone.title} sub={copy.gone.sub} />;
  if (state.kind === "offline") return <SurveyMessage title={copy.errors.offline.title} sub={copy.errors.offline.sub} action={{ label: copy.buttons.retry, onClick: load }} />;

  const { form, questions } = state;
  return (
    <div className="survey-page">
      <SurveyPlayer
        form={form}
        questions={questions}
        onSave={(values: Record<string, AnswerValue>) => saveResponse(form.id, values, responseId.current)}
        loadAnswers={(ids) => loadAnswers(form.id, ids)}
        tafel={tafel}
      />
    </div>
  );
}
