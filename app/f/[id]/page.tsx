"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { loadAnswers, loadForm, saveResponse } from "@/lib/data";
import { AnswerValue, Form, Question } from "@/lib/types";

/** Öffentlicher Link zum Ausfüllen eines Bogens. */
export default function FillPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ form: Form; questions: Question[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const responseId = useRef<string | undefined>(undefined);

  useEffect(() => {
    loadForm(id).then(setData, () => setError("Diesen Bogen gibt es nicht (mehr)."));
  }, [id]);

  async function save(values: Record<string, AnswerValue>) {
    responseId.current = await saveResponse(id, values, responseId.current);
  }

  if (error) return <p className="survey-message">{error}</p>;
  if (!data) return <p className="survey-message">Lädt …</p>;

  return (
    <div className="survey-page">
      <SurveyPlayer form={data.form} questions={data.questions} onSave={save} loadAnswers={() => loadAnswers(id)} />
    </div>
  );
}
