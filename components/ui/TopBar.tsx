import styles from "./ui.module.css";

interface Props {
  onBack?: () => void;
  backLabel?: string;
  /** 0–1; zeigt Balken + Prozent */
  progress?: number;
  /** Text links unter dem Balken (Bereich, „Halbzeit!“ …) */
  label?: string;
}

/** „< Zurück“ + Fortschrittsbalken mit Prozent und Bereichs-Label. */
export function TopBar({ onBack, backLabel = "Zurück", progress, label }: Props) {
  const pct = progress === undefined ? undefined : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div>
      {onBack ? (
        <button type="button" className={styles.back} onClick={onBack}>
          &lt; {backLabel}
        </button>
      ) : (
        <div className={styles.backPlaceholder} />
      )}
      {pct !== undefined && (
        <>
          <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div className={styles.progressFill} style={{ width: `${Math.max(pct, 6)}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>{label}</span>
            <span>{pct} %</span>
          </div>
        </>
      )}
    </div>
  );
}
