import styles from "./ui.module.css";

/** Unauffälliger Zweit-Button (z. B. „Überspringen“) unter dem Haupt-Button. */
export function TextButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={styles.textButton} />;
}
