"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTheme } from "@/brand/themes";
import { AdminHeader } from "@/components/AdminHeader";
import { useDialog } from "@/components/admin/Dialog";
import { Icon } from "@/components/admin/icons";
import { deleteForm, duplicateForm, listForms, listResponseCounts } from "@/lib/data";
import { Form, STATUS_LABELS } from "@/lib/types";
import styles from "./list.module.css";

export default function MyFormsPage() {
  const router = useRouter();
  const dialog = useDialog();
  const [forms, setForms] = useState<Form[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([listForms(), listResponseCounts()]).then(
        ([f, c]) => {
          setForms(f);
          setCounts(c);
        },
        (e: Error) => setError(e.message)
      ),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  async function duplicate(f: Form) {
    try {
      const copy = await duplicateForm(f.id);
      router.push(`/b/${copy.id}/bearbeiten`);
    } catch (e) {
      dialog.toast((e as Error).message, "error");
    }
  }

  async function remove(f: Form) {
    const n = counts[f.id] ?? 0;
    const ok = await dialog.confirm({
      title: `„${f.title}“ löschen?`,
      text: n === 1 ? "Der Bogen und seine Antwort werden endgültig gelöscht." : n ? `Der Bogen und alle ${n} Antworten werden endgültig gelöscht.` : "Der Bogen wird endgültig gelöscht.",
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteForm(f.id);
      dialog.toast("Bogen gelöscht");
      load();
    } catch (e) {
      dialog.toast((e as Error).message, "error");
    }
  }

  return (
    <>
      <AdminHeader>
        <Link href="/neu" className="btn primary"><Icon name="plus" size={18} /> Neuer Bogen</Link>
      </AdminHeader>
      <main className="admin-main admin-narrow">
        <h1>Meine Bögen</h1>
        {error && <p className="error">{error}</p>}
        {!forms ? (
          <p className="muted">Lädt …</p>
        ) : forms.length === 0 ? (
          <div className={styles.empty}>
            <p>Noch keine Bögen.</p>
            <Link href="/neu" className="btn primary big"><Icon name="plus" size={18} /> Ersten Bogen anlegen</Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {forms.map((f) => (
              <li key={f.id} className={styles.item} data-form={f.title}>
                <Link href={`/b/${f.id}/bearbeiten`} className={styles.main}>
                  <strong>{f.title || "Ohne Namen"}</strong>
                  <span className={styles.meta}>
                    <span className={`status-pill status-${f.status}`}>{STATUS_LABELS[f.status]}</span>
                    {counts[f.id] ?? 0} {counts[f.id] === 1 ? "Antwort" : "Antworten"} · {getTheme(f.style).name}
                  </span>
                </Link>
                <div className={styles.actions}>
                  <Link className="btn small ghost" href={`/b/${f.id}/bearbeiten?teilen=1`}>Teilen</Link>
                  <Link className="btn small ghost" href={`/b/${f.id}/ergebnisse`}>Ergebnisse</Link>
                  <button type="button" className="icon-btn" onClick={() => duplicate(f)} aria-label="Duplizieren"><Icon name="copy" /></button>
                  <button type="button" className="icon-btn danger" onClick={() => remove(f)} aria-label="Löschen"><Icon name="trash" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
