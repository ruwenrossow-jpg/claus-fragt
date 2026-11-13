"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { createForm } from "@/lib/data";
import { questionsForForm } from "@/lib/framework";
import { EVENT_TYPES, EventType, STYLES } from "@/lib/styles";

/** Neuer Bogen in zwei Schritten: Event-Typ wählen (= Vorauswahl von Style, Teach, Menti, Ansprache) → Name → Editor. */
export default function NewFormPage() {
  const router = useRouter();
  const [type, setType] = useState<EventType | null>(null);
  const [eventName, setEventName] = useState("");
  const [thema, setThema] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !eventName.trim()) return;
    setBusy(true);
    try {
      const settings = { eventTyp: type.id, eventName: eventName.trim(), thema: thema.trim() || undefined, teach: type.teach, menti: type.menti, ansprache: type.ansprache };
      const form = await createForm({
        title: eventName.trim(),
        style: type.style,
        settings,
        questions: (formId) => questionsForForm(formId, { style: type.style, eventTyp: type.id, teach: type.teach }),
      });
      router.push(`/b/${form.id}/bearbeiten`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="admin-main admin-narrow">
        <h1>Neuer Bogen</h1>
        {!type ? (
          <>
            <p className="muted">Was für ein Event ist es? Den Rest stellen wir passend ein.</p>
            <div className="tiles">
              {EVENT_TYPES.map((t) => (
                <button key={t.id} type="button" className="tile" onClick={() => setType(t)}>
                  <strong>{t.name}</strong>
                  <span className="muted">{STYLES[t.style].name} · {t.ansprache}{t.teach ? " · Teach" : ""}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form className="panel" onSubmit={create}>
            <p className="muted">
              {type.name} ·{" "}
              <button type="button" className="link" onClick={() => setType(null)}>ändern</button>
            </p>
            <label className="field-label" htmlFor="event">Wie heißt dein Event?</label>
            <input id="event" type="text" autoFocus value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="z. B. Hackathon Flensburg" />
            <label className="field-label" htmlFor="thema">Thema (optional)</label>
            <input id="thema" type="text" value={thema} onChange={(e) => setThema(e.target.value)} placeholder="z. B. Wasserstoff" />
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn primary big" disabled={busy || !eventName.trim()} style={{ marginTop: 16 }}>
              {busy ? "Legt an …" : "Los"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
