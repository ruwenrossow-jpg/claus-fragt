import styles from "./ui.module.css";

interface Props {
  onBack?: () => void;
  backLabel?: string;
  /** 0–1; zeigt Balken + Prozent */
  progress?: number;
  /** Text links unter dem Balken („Los geht's!“, „Halbzeit!“ …) */
  label?: string;
  /** statt „Zurück“: kurzer Hinweis (z. B. Entwurf) */
  notice?: string;
}

/** Kopfzone: „< Zurück“ + Fortschrittsbalken mit Prozent. Ohne Inhalte bleibt der Platz frei (festes Raster). */
export function TopBar({ onBack, backLabel = "Zurück", progress, label, notice }: Props) {
  const pct = progress === undefined ? undefined : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <>
      {onBack ? (
        <button type="button" className={styles.back} onClick={onBack}>
          &lt; {backLabel}
        </button>
      ) : notice ? (
        <p className={styles.notice}>{notice}</p>
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
    </>
  );
}
