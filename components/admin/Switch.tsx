import styles from "./admin.module.css";

/** Schalter (an/aus) mit Beschriftung links, z. B. „Pflicht“. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={styles.switch} onClick={() => onChange(!checked)}>
      {label}
      <span className={styles.switchTrack}>
        <span className={styles.switchThumb} />
      </span>
    </button>
  );
}
