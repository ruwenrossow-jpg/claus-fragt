import Link from "next/link";
import { AdminHeader } from "@/components/AdminHeader";
import { DataError } from "@/lib/data";
import { Icon } from "./icons";
import styles from "./admin.module.css";

/**
 * Lade-, Fehler- und „nicht gefunden“-Zustand einer Admin-Seite, immer mit Kopfzeile und Weg zurück.
 * error = null → lädt.
 */
export function PageState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const notFound = error instanceof DataError && error.kind === "not_found";
  return (
    <>
      <AdminHeader />
      <main className="admin-main admin-narrow">
        {!error ? (
          <p className={styles.pageLoading} role="status">Lädt …</p>
        ) : (
          <div className={styles.pageState}>
            <h1>{notFound ? "Diesen Bogen gibt es nicht." : "Das hat gerade nicht geklappt."}</h1>
            <p>{notFound ? "Vielleicht ist der Link alt oder unvollständig." : error instanceof Error ? error.message : String(error)}</p>
            <div className="row">
              <Link href="/meine-boegen" className="btn primary"><Icon name="back" size={18} /> Zu meinen Bögen</Link>
              {!notFound && onRetry && <button type="button" className="btn" onClick={onRetry}>Nochmal versuchen</button>}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
