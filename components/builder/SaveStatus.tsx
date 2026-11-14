import { Icon } from "@/components/admin/icons";
import { SaveState } from "./useFormDraft";
import styles from "./builder.module.css";

/** „Gespeichert“ / „Speichert …“ in der Kopfzeile (Autosave). Bei Fehler: erneut versuchen. */
export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "error") {
    return (
      <button type="button" className={`${styles.saveStatus} ${styles.saveError}`} onClick={onRetry} data-save={state}>
        <Icon name="alert" size={16} /> Nicht gespeichert<span className="hide-mobile"> – erneut versuchen</span>
      </button>
    );
  }
  return (
    <span className={styles.saveStatus} role="status" aria-live="polite" data-save={state}>
      {state === "saved" ? <><Icon name="check" size={16} /> <span className="hide-mobile">Gespeichert</span><span className="only-mobile sr-only">Gespeichert</span></> : <><span className="hide-mobile">Speichert …</span><span className="only-mobile" aria-hidden>…</span></>}
    </span>
  );
}
