"use client";

import { useLayoutEffect, useRef } from "react";
import { useKeyboard } from "./useKeyboard";
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
  /** Kompakte Bühne (kleiner Claus + Frage), solange die Handy-Tastatur offen ist. Fehlt = Bühne bleibt. */
  typingStage?: React.ReactNode;
}

/**
 * Ein Bogen-Screen im festen Layout-Raster (Kopf · Bühne · Inhalt · Fuß). Die Zonen haben auf jedem Screen dieselbe Höhe,
 * dadurch stehen Fortschritt, Claus, Sprechblase und Button immer an derselben Stelle. Nur die Inhaltszone scrollt.
 */
export function Screen({ header, stage, children, footer, note, bodyKey, typingStage }: Props) {
  const body = useRef<HTMLDivElement>(null);
  const keyboard = useKeyboard();
  const typing = keyboard.open && Boolean(typingStage);
  // Tastatur offen: Feld im sichtbaren Bereich halten
  useLayoutEffect(() => {
    if (!typing) return;
    const el = document.activeElement;
    if (el instanceof HTMLElement && body.current?.contains(el)) el.scrollIntoView({ block: "nearest" });
  }, [typing, keyboard.height]);
  // Überlauf markieren (Inhaltszone und scrollende Antwort-Box): Verlauf unten, solange noch etwas kommt; oben, sobald gescrollt ist
  useLayoutEffect(() => {
    const zone = body.current;
    if (!zone) return;
    const els = [zone, ...Array.from(zone.querySelectorAll<HTMLElement>("[data-scroll]"))];
    const check = () =>
      els.forEach((el) => {
        el.setAttribute("data-overflow", String(el.scrollHeight - el.scrollTop - el.clientHeight > 2));
        el.setAttribute("data-scrolled", String(el.scrollTop > 2));
      });
    check();
    const ro = new ResizeObserver(check);
    els.forEach((el) => {
      ro.observe(el);
      Array.from(el.children).forEach((c) => ro.observe(c));
      el.addEventListener("scroll", check, { passive: true });
    });
    return () => {
      ro.disconnect();
      els.forEach((el) => el.removeEventListener("scroll", check));
    };
  }, [bodyKey]);
  return (
    <div
      className={`${styles.screen} ${typing ? styles.typing : ""}`}
      style={typing ? { position: "fixed", top: keyboard.top, left: 0, right: 0, height: keyboard.height, zIndex: 50 } : undefined}
      data-typing={typing || undefined}
    >
      <div className={styles.grid}>
        <div className={styles.zoneHead}>{header}</div>
        <div className={styles.zoneStage}>{stage}</div>
        {typing && <div className={styles.zoneTyping}>{typingStage}</div>}
        <div key={bodyKey} ref={body} className={styles.zoneBody} data-zone="body">{children}</div>
        <div className={styles.zoneFoot}>
          <p className={styles.note} role="status">{note}</p>
          {footer}
        </div>
      </div>
    </div>
  );
}
