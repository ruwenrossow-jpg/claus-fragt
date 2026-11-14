"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { COPY_DEFAULT as COPY } from "@/brand/copy";
import { getTheme } from "@/brand/themes";
import { QrCode } from "@/components/QrCode";
import { SurveyMessage } from "@/components/survey/SurveyMessage";
import { loadPublicForm } from "@/lib/data";
import { Form, isTrashed } from "@/lib/types";

/** Vollbild für den Beamer: großer QR-Code + Link. Gelöschte/unbekannte Bögen zeigen „gibt es nicht mehr“. */
export default function QrPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null | undefined>(undefined);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
    loadPublicForm(slug).then((d) => setForm(isTrashed(d.form) ? null : d.form), () => setForm(null));
  }, [slug]);

  if (form === null) return <SurveyMessage title={COPY.gone.title} sub={COPY.gone.sub} />;
  const url = `${origin}/f/${slug}`;
  return (
    <main className="beamer">
      <div>
        <h1>{form?.title ?? ""}</h1>
        <p>Scan mich und sag uns ehrlich, wie es war!</p>
        <p className="beamer-url">{origin && url.replace(/^https?:\/\//, "")}</p>
        {form && form.status !== "published" && <p className="beamer-hint">Hinweis: Der Bogen ist {form.status === "draft" ? "noch nicht live" : "geschlossen"}.</p>}
        <img src={getTheme(form?.style).mascot.happy} alt="" className="beamer-mascot" width={440} height={440} />
      </div>
      {origin ? <QrCode text={url} size={520} className="beamer-qr" /> : <div className="beamer-qr" />}
    </main>
  );
}
