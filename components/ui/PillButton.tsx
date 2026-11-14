import styles from "./ui.module.css";

/** Großer roter Haupt-Button (Los geht's, WEITER!, …). Pro Screen genau einer, immer an derselben Stelle im Fuß. */
export function PillButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={styles.pill} data-pill />;
}

/** Platzhalter in Button-Höhe für Screens ohne Button (Danke, Geschlossen). */
export function PillSpacer() {
  return <div className={styles.pillSpacer} aria-hidden data-pill />;
}
