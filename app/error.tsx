"use client";

import { useEffect } from "react";
import { COPY_DEFAULT as COPY } from "@/brand/copy";
import { SurveyMessage } from "@/components/survey/SurveyMessage";

/** Unerwarteter Fehler in einer Seite: freundlicher Screen im Claus-Look mit „Nochmal“. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.warn("Claus fragt – Fehler:", error);
  }, [error]);
  return <SurveyMessage title={COPY.crash.title} sub={COPY.crash.sub} action={{ label: COPY.buttons.retry, onClick: retry }} />;
}
