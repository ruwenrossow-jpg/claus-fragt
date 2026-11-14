"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getTheme } from "@/brand/themes";
import { AdminHeader } from "@/components/AdminHeader";
import { useDialog } from "@/components/admin/Dialog";
import { Icon } from "@/components/admin/icons";
import { useSession } from "@/lib/auth";
import { claimForms, duplicateForm, listForms, listResponseCounts, restoreForm, trashForm } from "@/lib/data";
import { Form, STATUS_LABELS, isTestForm, isTrashed } from "@/lib/types";
import styles from "./list.module.css";

const dateDe = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
const answersLabel = (n: number) => `${n} ${n === 1 ? "Antwort" : "Antworten"}`;

/**
 * Meine Bögen + Papierkorb (?papierkorb=1). Löschen = Papierkorb (Soft-Delete), Wiederherstellen jederzeit.
 * Testbögen (settings.test) sind ausgeblendet, sichtbar mit ?tests=1.
 */
function MyForms() {
  const router = useRouter();
  const dialog = useDialog();
  const params = useSearchParams();
  const trashView = params.get("papierkorb") === "1";
  const showTests = params.get("tests") === "1";
  const [forms, setForms] = useState<Form[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  /** Bogen, an dem gerade gearbeitet wird (Doppelklick-Schutz) */
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    return Promise.all([listForms(), listResponseCounts()]).then(
      ([f, c]) => {
        setForms(f);
        setCounts(c);
      },
      (e: Error) => setError(e.message)
    );
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const uid = useSession()?.user.id;
  // Mit Login (Spalte owner_id vorhanden): nur eigene Bögen; Bögen von vor dem Login lassen sich übernehmen
  const owned = (forms ?? []).some((f) => "owner_id" in f);
  const unclaimed = owned && uid ? (forms ?? []).filter((f) => f.owner_id === null && !isTestForm(f)) : [];
  const visible = (forms ?? []).filter((f) => (showTests || !isTestForm(f)) && (!owned || !uid || f.owner_id === uid || (showTests && isTestForm(f))));
  const shown = visible.filter((f) => isTrashed(f) === trashView);
  const trashCount = visible.filter(isTrashed).length;
  const query = (trash: boolean) => {
    const q = new URLSearchParams();
    if (trash) q.set("papierkorb", "1");
    if (showTests) q.set("tests", "1");
    const s = q.toString();
    return s ? `/meine-boegen?${s}` : "/meine-boegen";
  };

  async function claim() {
    if (!uid || busyId) return;
    setBusyId("claim");
    try {
      await claimForms(unclaimed.map((f) => f.id), uid);
      await load();
      dialog.toast(unclaimed.length === 1 ? "1 Bogen gehört jetzt zu deinem Konto" : `${unclaimed.length} Bögen gehören jetzt zu deinem Konto`);
    } catch (e) {
      dialog.toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function act(f: Form, task: () => Promise<void>) {
    if (busyId) return;
    setBusyId(f.id);
    try {
      await task();
    } catch (e) {
      dialog.toast((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  const duplicate = (f: Form) =>
    act(f, async () => {
      const copy = await duplicateForm(f.id);
      router.push(`/b/${copy.id}/bearbeiten`);
    });

  async function trash(f: Form) {
    const n = counts[f.id] ?? 0;
    const ok = await dialog.confirm({
      title: `„${f.title || "Ohne Namen"}“ löschen?`,
      text: `Der Bogen kommt in den Papierkorb und sein Link zeigt dann „gibt es nicht mehr“. Fragen${n ? ` und ${answersLabel(n)}` : ""} bleiben erhalten – du kannst ihn jederzeit wiederherstellen.`,
      confirmLabel: "In den Papierkorb",
      danger: true,
    });
    if (!ok) return;
    await act(f, async () => {
      await trashForm(f.id);
      await load();
      dialog.toast("In den Papierkorb gelegt", "ok", { label: "Rückgängig", onClick: () => restore(f) });
    });
  }

  const restore = (f: Form) =>
    act(f, async () => {
      await restoreForm(f.id);
      await load();
      dialog.toast(`„${f.title || "Ohne Namen"}“ ist wieder da`);
    });

  return (
    <>
      <AdminHeader>
        <Link href="/neu" className="btn primary"><Icon name="plus" size={18} /> Neuer Bogen</Link>
      </AdminHeader>
      <main className="admin-main admin-narrow">
        {trashView && <Link href={query(false)} className="back-link"><Icon name="back" size={18} /> Meine Bögen</Link>}
        <h1 style={trashView ? { marginTop: 12 } : undefined}>{trashView ? "Papierkorb" : "Meine Bögen"}</h1>
        {trashView && <p className="muted">Gelöschte Bögen mit allen Fragen und Antworten. Ihre Links sind aus, bis du sie wiederherstellst.</p>}
        {error && (
          <div className="warn" role="alert">
            {error} <button type="button" className="btn small" onClick={load}>Nochmal versuchen</button>
          </div>
        )}
        {!trashView && unclaimed.length > 0 && (
          <div className={`warn ${styles.claim}`} data-claim>
            <span>{unclaimed.length === 1 ? "1 Bogen ist" : `${unclaimed.length} Bögen sind`} von vor dem Login und noch keinem Konto zugeordnet ({unclaimed.map((f) => `„${f.title || "Ohne Namen"}“`).join(", ")}).</span>
            <button type="button" className="btn small" onClick={claim} disabled={busyId === "claim"}>Zu meinem Konto</button>
          </div>
        )}
        {!forms ? (
          !error && <p className="muted" role="status">Lädt …</p>
        ) : shown.length === 0 ? (
          <div className={styles.empty}>
            {trashView ? (
              <p>Der Papierkorb ist leer.</p>
            ) : (
              <>
                <p>Noch keine Bögen.</p>
                <Link href="/neu" className="btn primary big"><Icon name="plus" size={18} /> Ersten Bogen anlegen</Link>
              </>
            )}
          </div>
        ) : (
          <ul className={styles.list}>
            {shown.map((f) => (
              <li key={f.id} className={styles.item} data-form={f.title}>
                <Link href={trashView ? `/b/${f.id}/ergebnisse` : `/b/${f.id}/bearbeiten`} className={styles.main}>
                  <strong>{f.title || "Ohne Namen"}</strong>
                  <span className={styles.meta}>
                    {trashView ? (
                      <span>Gelöscht am {dateDe(f.settings!.geloescht!)}</span>
                    ) : (
                      <span className={`status-pill status-${f.status}`}>{STATUS_LABELS[f.status]}</span>
                    )}
                    {isTestForm(f) && <span className="status-pill">Test</span>}
                    <span>{answersLabel(counts[f.id] ?? 0)} · {getTheme(f.style).name}</span>
                  </span>
                </Link>
                <div className={styles.actions}>
                  {trashView ? (
                    <button type="button" className="btn small" onClick={() => restore(f)} disabled={busyId === f.id}>
                      <Icon name="restart" size={16} /> Wiederherstellen
                    </button>
                  ) : (
                    <>
                      <Link className="btn small ghost" href={`/b/${f.id}/bearbeiten?teilen=1`}>Teilen</Link>
                      <Link className="btn small ghost" href={`/b/${f.id}/ergebnisse`}>Ergebnisse</Link>
                      <Link className="btn small ghost hide-mobile" href={`/b/${f.id}/tafel/steuerung`}>Tafel</Link>
                      <button type="button" className="icon-btn" onClick={() => duplicate(f)} disabled={busyId === f.id} aria-label="Duplizieren"><Icon name="copy" /></button>
                      <button type="button" className="icon-btn danger" onClick={() => trash(f)} disabled={busyId === f.id} aria-label="Löschen"><Icon name="trash" /></button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!trashView && forms && (
          <p className={styles.trashLink}>
            <Link href={query(true)} className="back-link"><Icon name="trash" size={16} /> Papierkorb{trashCount ? ` (${trashCount})` : ""}</Link>
          </p>
        )}
      </main>
    </>
  );
}

export default function MyFormsPage() {
  return (
    <Suspense fallback={null}>
      <MyForms />
    </Suspense>
  );
}
