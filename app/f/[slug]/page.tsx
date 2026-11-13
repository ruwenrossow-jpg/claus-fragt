"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { loadAnswers, loadPublicForm, saveResponse } from "@/lib/data";
import { AnswerValue, Form, Question } from "@/lib/types";

/** Öffentlicher Link zum Ausfüllen: /f/<slug>. Kein Login, keine personenbezogenen Daten. */
export default function FillPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{ form: Form; questions: Question[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const responseId = useRef<string | undefined>(undefined);

  useEffect(() => {
    loadPublicForm(slug).then(setData, () => setError("Diese Umfrage gibt es nicht (mehr)."));
  }, [slug]);

  if (error) return <p className="survey-message">{error}</p>;
  if (!data) return <p className="survey-message">Lädt …</p>;
  const { form } = data;

  async function save(values: Record<string, AnswerValue>) {
    responseId.current = await saveResponse(form.id, values, responseId.current);
  }

  return (
    <div className="survey-page">
      <SurveyPlayer form={form} questions={data.questions} onSave={save} loadAnswers={() => loadAnswers(form.id)} />
    </div>
  );
}
