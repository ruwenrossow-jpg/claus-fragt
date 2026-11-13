"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { deleteForm, duplicateForm, listForms, listResponseCounts } from "@/lib/data";
import { getStyle } from "@/lib/styles";
import { Form, STATUS_LABELS } from "@/lib/types";

export default function MyFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    Promise.all([listForms(), listResponseCounts()]).then(
      ([f, c]) => {
        setForms(f);
        setCounts(c);
      },
      (e: Error) => setError(e.message)
    );
  useEffect(() => {
    load();
  }, []);

  async function duplicate(f: Form) {
    try {
      const copy = await duplicateForm(f.id);
      router.push(`/b/${copy.id}/bearbeiten`);
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
      <AdminHeader />
      <main className="admin-main admin-narrow">
        <h1>Meine Bögen</h1>
        <Link href="/neu" className="btn primary big" style={{ margin: "8px 0 12px" }}>+ Neuer Bogen</Link>
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
                <div className="muted">
                  {STATUS_LABELS[f.status]} · {counts[f.id] ?? 0} Antworten · {getStyle(f.style).name}
                </div>
              </div>
              <div className="row">
                <Link className="btn small" href={`/b/${f.id}/bearbeiten`}>Bearbeiten</Link>
                <Link className="btn small" href={`/b/${f.id}/bearbeiten?teilen=1`}>Teilen</Link>
                <Link className="btn small" href={`/b/${f.id}/ergebnisse`}>Ergebnisse</Link>
                <button type="button" className="btn small" onClick={() => duplicate(f)}>Duplizieren</button>
                <button type="button" className="btn small danger" onClick={() => remove(f)}>Löschen</button>
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}
