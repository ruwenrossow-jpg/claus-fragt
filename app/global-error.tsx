"use client";

import "@/brand/tokens.css";
import "./globals.css";
import { COPY_DEFAULT as COPY } from "@/brand/copy";
import { SurveyMessage } from "@/components/survey/SurveyMessage";

/** Fehler im Root-Layout: eigenes Dokument (ohne die Schriften aus layout.tsx), gleicher Claus-Screen. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="de">
      <body>
        <title>Claus fragt</title>
        <SurveyMessage title={COPY.crash.title} sub={COPY.crash.sub} action={{ label: COPY.buttons.retry, onClick: retry }} />
      </body>
    </html>
  );
}
