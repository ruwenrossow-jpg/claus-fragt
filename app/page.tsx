"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { missingEnv, supabase, supabaseConfigured } from "@/lib/supabase";
import { Form, STATUS_LABELS } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase.from("forms").select("*").order("updated_at", { ascending: false });
    if (error) setError(error.message);
    setForms((data as Form[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createForm() {
    const { data, error } = await supabase.from("forms").insert({ title: "Neuer Evaluationsbogen" }).select().single();
    if (error) return setError(error.message);
    router.push(`/forms/${data.id}/edit`);
  }

  async function deleteForm(id: string) {
    if (!confirm("Bogen inklusive aller Antworten löschen?")) return;
    const { error } = await supabase.from("forms").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  return (
    <main>
      <div className="row spread">
        <h1>Claus fragt</h1>
        <button className="primary" onClick={createForm}>+ Neuer Bogen</button>
      </div>
      <p className="muted">Evaluationsbögen erstellen, teilen und auswerten.</p>
      {!supabaseConfigured && <p className="error">Fehlende Umgebungsvariablen: {missingEnv.join(", ")}. Lokal in .env.local eintragen, auf Vercel unter Settings → Environment Variables (danach neu deployen).</p>}
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Lädt …</p>
      ) : forms.length === 0 ? (
        <p className="muted">Noch keine Bögen.</p>
      ) : (
        forms.map((f) => (
          <div key={f.id} className="card row spread">
            <div>
              <strong>{f.title}</strong>
              <div className="muted">{STATUS_LABELS[f.status]} · zuletzt geändert {new Date(f.updated_at).toLocaleString("de-DE")}</div>
            </div>
            <div className="row">
              <Link href={`/forms/${f.id}/edit`}>Bearbeiten</Link>
              <Link href={`/f/${f.id}`}>Ansehen</Link>
              <Link href={`/forms/${f.id}/results`}>Auswertung</Link>
              <button className="danger" onClick={() => deleteForm(f.id)}>Löschen</button>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
