import styles from "./ui.module.css";

/** Großer roter Haupt-Button (START!, WEITER!, …). Pro Screen genau einer. */
export function PillButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={styles.pill} />;
}
