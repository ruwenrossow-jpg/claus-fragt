"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { THEMES, ThemeId } from "@/brand/themes";
import { AdminHeader } from "@/components/AdminHeader";
import { Icon } from "@/components/admin/icons";
import { ArtChoice } from "@/components/builder/ArtChoice";
import { createForm } from "@/lib/data";

/**
 * Neuer Bogen: Name, Beschreibung und eine Wahl (Inspirierend/Lernend) – dann leer in den Editor.
 * ?test=1 (nur E2E-Test): Bogen bekommt settings.test = true und ist in „Meine Bögen“ ausgeblendet.
 */
function NewForm() {
  const router = useRouter();
  const isTest = useSearchParams().get("test") === "1";
  const sending = useRef(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [art, setArt] = useState<ThemeId>(THEMES[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Bitte gib dem Bogen einen Namen.");
      document.getElementById("name")?.focus();
      return;
    }
    if (sending.current) return; // Doppelklick legt keinen zweiten Bogen an
    sending.current = true;
    setBusy(true);
    try {
      const form = await createForm({ title: title.trim(), description: description.trim() || null, style: art, settings: isTest ? { test: true } : {} });
      router.push(`/b/${form.id}/bearbeiten`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      sending.current = false;
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="admin-main admin-narrow">
        <Link href="/meine-boegen" className="back-link"><Icon name="back" size={18} /> Meine Bögen</Link>
        <h1 style={{ marginTop: 12 }}>Neuer Bogen</h1>
        <form className="panel" onSubmit={create} noValidate>
          <label className="field-label" htmlFor="name">Name</label>
          <input id="name" type="text" autoFocus maxLength={120} aria-invalid={Boolean(error && !title.trim())} aria-describedby={error ? "neu-fehler" : undefined} value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }} placeholder="z. B. Hackathon Flensburg" />
          <label className="field-label" htmlFor="beschreibung">Beschreibung (optional, erscheint auf dem Start-Screen)</label>
          <textarea id="beschreibung" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z. B. Danke, dass du dabei warst! Sag uns kurz, wie es war." />
          <span className="field-label">Was für ein Event ist es?</span>
          <ArtChoice value={art} onChange={setArt} />
          {error && <p className="error" id="neu-fehler" role="alert">{error}</p>}
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 22 }}>
            <Link href="/meine-boegen" className="btn ghost">Abbrechen</Link>
            <button type="submit" className="btn primary big" disabled={busy}>{busy ? "Legt an …" : "Bogen anlegen"}</button>
          </div>
        </form>
      </main>
    </>
  );
}

export default function NewFormPage() {
  return (
    <Suspense fallback={null}>
      <NewForm />
    </Suspense>
  );
}
