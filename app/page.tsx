"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { createForm, deleteForm, listForms } from "@/lib/data";
import { missingEnv } from "@/lib/supabase";
import { Form, STATUS_LABELS } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => listForms().then(setForms, (e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function create() {
    try {
      const f = await createForm();
      router.push(`/forms/${f.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(f: Form) {
    if (!confirm(`„${f.title}“ inklusive aller Antworten löschen?`)) return;
    await deleteForm(f.id).catch((e: Error) => setError(e.message));
    load();
  }

  return (
    <>
      <AdminHeader>
        <button type="button" className="btn primary" onClick={create}>+ Neuer Bogen</button>
      </AdminHeader>
      <main className="admin-main admin-narrow">
        <h1>Evaluationsbögen</h1>
        <p className="muted">Bögen bauen, per Link teilen und auswerten.</p>
        {missingEnv.length > 0 && <p className="error">Fehlende Umgebungsvariablen: {missingEnv.join(", ")}</p>}
        {error && <p className="error">{error}</p>}
        {!forms ? (
          <p className="muted">Lädt …</p>
        ) : forms.length === 0 ? (
          <p className="muted">Noch keine Bögen – leg den ersten an.</p>
        ) : (
          forms.map((f) => (
            <div key={f.id} className="panel row spread">
              <div>
                <strong>{f.title}</strong>
                <div className="muted">{STATUS_LABELS[f.status]} · geändert {new Date(f.updated_at).toLocaleString("de-DE")}</div>
              </div>
              <div className="row">
                <Link className="btn small" href={`/forms/${f.id}/edit`}>Bearbeiten</Link>
                <Link className="btn small" href={`/f/${f.id}`} target="_blank">Ansehen</Link>
                <Link className="btn small" href={`/forms/${f.id}/results`}>Auswertung</Link>
                <button type="button" className="btn small danger" onClick={() => remove(f)}>Löschen</button>
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}
