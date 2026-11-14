"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/admin/icons";
import { EditorProps } from "./types";
import { letter } from "./letters";
import styles from "./editors.module.css";

interface Props extends EditorProps {
  /** Markierung links wie im Bogen: Kreis (Auswahl), Kästchen (Mehrfach), Zahl (Stufen) */
  marker: "radio" | "check" | "number";
  /** feste Anzahl (Stufen): nur umbenennen, nicht hinzufügen/entfernen */
  fixed?: boolean;
}

/** Antwortoptionen bearbeiten wie bei Google Forms: Enter legt die nächste Option an. */
export function OptionsEditor({ question, onChange, marker, fixed = false }: Props) {
  const opts = question.options;
  const set = (options: string[]) => onChange({ options });
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusIndex === null) return;
    list.current?.querySelectorAll("input")[focusIndex]?.focus();
    setFocusIndex(null);
  }, [focusIndex]);

  const add = (at = opts.length) => {
    set([...opts.slice(0, at), "", ...opts.slice(at)]);
    setFocusIndex(at);
  };

  return (
    <div ref={list}>
      {opts.map((o, i) => (
        <div key={i} className={styles.option}>
          {marker === "number" ? <span className={styles.number}>{i + 1}</span> : <span className={`${styles.mark} ${marker === "check" ? styles.markCheck : ""}`} />}
          <input
            type="text"
            className={styles.input}
            value={o}
            placeholder={fixed ? `Stufe ${i + 1}` : `Antwort ${letter(i)}`}
            aria-label={fixed ? `Stufe ${i + 1}` : `Antwort ${letter(i)}`}
            onChange={(e) => set(opts.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !fixed) {
                e.preventDefault();
                add(i + 1);
              }
            }}
          />
          {!fixed && (
            <button type="button" className="icon-btn" onClick={() => set(opts.filter((_, j) => j !== i))} aria-label={`Antwort ${letter(i)} entfernen`}>
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      ))}
      {!fixed && (
        <button type="button" className={styles.addOption} onClick={() => add()}>
          <span className={`${styles.mark} ${marker === "check" ? styles.markCheck : ""}`} />
          Antwort hinzufügen
        </button>
      )}
    </div>
  );
}
