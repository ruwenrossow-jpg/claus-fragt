"use client";

import { useLayoutEffect, useRef } from "react";
import styles from "./ui.module.css";

interface Props {
  /** Kopfzone: Zurück + Fortschritt (Höhe fest, auch wenn leer) */
  header?: React.ReactNode;
  /** Bühne: Claus + Sprechblase (Höhe fest) */
  stage: React.ReactNode;
  /** Inhaltszone: Antworten, Ergebnis, Texte – scrollt bei Bedarf in sich */
  children: React.ReactNode;
  /** Haupt-Button (unten verankert, auf jedem Screen an derselben Stelle) */
  footer?: React.ReactNode;
  /** eine Zeile über dem Button (Pflicht-Hinweis, Fehler) – Platz ist immer reserviert */
  note?: string | null;
  /** wechselt pro Screen → Inhaltszone startet wieder oben (Scroll-Position) */
  bodyKey?: string;
}

/**
 * Ein Bogen-Screen im festen Layout-Raster (Kopf · Bühne · Inhalt · Fuß). Die Zonen haben auf jedem Screen dieselbe Höhe,
 * dadurch stehen Fortschritt, Claus, Sprechblase und Button immer an derselben Stelle. Nur die Inhaltszone scrollt.
 */
export function Screen({ header, stage, children, footer, note, bodyKey }: Props) {
  const body = useRef<HTMLDivElement>(null);
  // Überlauf der Inhaltszone markieren (für den Scroll-Verlauf); unten angekommen → kein Verlauf mehr
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const check = () => el.setAttribute("data-overflow", String(el.scrollHeight - el.scrollTop - el.clientHeight > 2));
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [bodyKey]);
  return (
    <div className={styles.screen}>
      <div className={styles.grid}>
        <div className={styles.zoneHead}>{header}</div>
        <div className={styles.zoneStage}>{stage}</div>
        <div key={bodyKey} ref={body} className={styles.zoneBody} data-zone="body">{children}</div>
        <div className={styles.zoneFoot}>
          <p className={styles.note} role="status">{note}</p>
          {footer}
        </div>
      </div>
    </div>
  );
}
