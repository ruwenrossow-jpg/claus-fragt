import styles from "./ui.module.css";

interface Props {
  onBack?: () => void;
  backLabel?: string;
  /** 0–1; zeigt Balken + Prozent */
  progress?: number;
  /** Text links unter dem Balken („Los geht's!“, „Halbzeit!“ …) */
  label?: string;
  /** Name des Fortschrittsbalkens für Screenreader */
  progressLabel?: string;
}

/** Kopfzone: „< Zurück“ + Fortschrittsbalken mit Prozent. Ohne Inhalte bleibt der Platz frei (festes Raster). */
export function TopBar({ onBack, backLabel = "Zurück", progress, label, progressLabel = "Fortschritt" }: Props) {
  const pct = progress === undefined ? undefined : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <>
      {onBack ? (
        <button type="button" className={styles.back} onClick={onBack} data-back>
          <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
          {backLabel}
        </button>
      ) : (
        <div className={styles.backPlaceholder} />
      )}
      {pct !== undefined && (
        <>
          <div className={styles.progress} role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div className={styles.progressFill} style={{ width: `${Math.max(pct, 6)}%` }} />
          </div>
          <div className={styles.progressMeta} aria-hidden>
            <span>{label}</span>
            <span>{pct} %</span>
          </div>
        </>
      )}
    </>
  );
}
