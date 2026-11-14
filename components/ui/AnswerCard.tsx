import styles from "./ui.module.css";

/** Türkise Box, in der die Antwortmöglichkeiten stehen. Zu viel Inhalt scrollt IN der Box (Rahmen bleibt ganz sichtbar). `label` = Frage (für Screenreader, die Blase ist rein visuell). */
export function AnswerCard({ title, label, children }: { title?: string; label?: string; children: React.ReactNode }) {
  return (
    <div className={styles.card} role={label ? "group" : undefined} aria-label={label}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      <div className={styles.cardScroll} data-scroll>{children}</div>
    </div>
  );
}
