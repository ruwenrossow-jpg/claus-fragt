"use client";

import { useRef } from "react";
import { COPY_DEFAULT } from "@/brand/copy";
import styles from "./ui.module.css";

/**
 * Türkise Box, in der die Antwortmöglichkeiten stehen. Zu viel Inhalt scrollt IN der Box (Rahmen bleibt ganz sichtbar);
 * dann zeigen Verlauf + angeschnittene nächste Zeile + „mehr ↓“ am unteren Rand, dass noch etwas kommt (verschwindet, sobald man unten ist).
 * `label` = Frage (für Screenreader, die Blase ist rein visuell).
 */
export function AnswerCard({ title, label, more = COPY_DEFAULT.hints.more, children }: { title?: string; label?: string; more?: string; children: React.ReactNode }) {
  const scroll = useRef<HTMLDivElement>(null);
  return (
    <div className={styles.card} role={label ? "group" : undefined} aria-label={label}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      <div ref={scroll} className={styles.cardScroll} data-scroll>{children}</div>
      <button
        type="button"
        className={styles.more}
        tabIndex={-1}
        aria-hidden
        data-more
        onClick={() => scroll.current?.scrollBy({ top: scroll.current.clientHeight * 0.7, behavior: "smooth" })}
      >
        {more} <span aria-hidden>↓</span>
      </button>
    </div>
  );
}
