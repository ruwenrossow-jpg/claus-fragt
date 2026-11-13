"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTheme } from "@/brand/themes";
import { QrCode } from "@/components/QrCode";
import { loadPublicForm } from "@/lib/data";
import { Form } from "@/lib/types";

/** Vollbild für den Beamer: großer QR-Code + Link. */
export default function QrPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
    loadPublicForm(slug).then((d) => setForm(d.form), () => setForm(null));
  }, [slug]);
  const url = `${origin}/f/${slug}`;

  return (
    <main className="beamer">
      <div>
        <h1>{form?.settings?.eventName || form?.title || "Claus fragt"}</h1>
        <p>Scan mich und sag uns ehrlich, wie es war!</p>
        <p className="beamer-url">{url.replace(/^https?:\/\//, "")}</p>
      </div>
      {origin && <QrCode text={url} size={520} className="beamer-qr" />}
      <img src={getTheme(form?.style).mascot.happy} alt="" className="beamer-mascot" />
    </main>
  );
}
