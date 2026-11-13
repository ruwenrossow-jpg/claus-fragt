import { COPY } from "@/brand/copy";
import styles from "./ui.module.css";

/** „< zurück“ + optionaler Fortschrittsbalken (progress 0–1). */
export function TopBar({ onBack, progress }: { onBack?: () => void; progress?: number }) {
  return (
    <div>
      {onBack ? (
        <button type="button" className={styles.back} onClick={onBack}>
          &lt; {COPY.back}
        </button>
      ) : (
        <div className={styles.backPlaceholder} />
      )}
      {progress !== undefined && (
        <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className={styles.progressFill} style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
