import styles from "./ui.module.css";

/** Ein Bildschirm des Bogens (Prototyp-Raster 393 × 852). */
export function Screen({ header, children, footer }: { header?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className={styles.screen}>
      {header}
      <div className={styles.screenBody}>{children}</div>
      {footer && <div className={styles.screenFooter}>{footer}</div>}
    </div>
  );
}
