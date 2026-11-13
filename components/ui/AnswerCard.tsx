import styles from "./ui.module.css";

/** Türkise Box, in der die Antwortmöglichkeiten stehen. */
export function AnswerCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className={styles.card}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      {children}
    </div>
  );
}
