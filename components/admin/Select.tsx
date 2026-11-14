"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import styles from "./admin.module.css";

export interface SelectOption<V extends string | number> {
  value: V;
  label: string;
  /** kleine Zusatzzeile unter dem Namen */
  hint?: string;
  /** Überschrift einer Gruppe, die vor dieser Option beginnt */
  group?: string;
}

interface Props<V extends string | number> {
  value: V;
  options: SelectOption<V>[];
  onChange: (value: V) => void;
  label?: string;
  className?: string;
}

/** Eigene Auswahlliste im Admin-Look (statt nativem <select>): Optionen untereinander, Esc/Klick daneben schließt. */
export function Select<V extends string | number>({ value, options, onChange, label, className }: Props<V>) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`${styles.select} ${className ?? ""}`} ref={root}>
      <button type="button" className={styles.selectButton} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
        <span>{current?.label ?? "Auswählen"}</span>
        <Icon name="chevron" size={18} />
      </button>
      {open && (
        <div className={styles.selectList} role="listbox" aria-label={label}>
          {options.map((o) => (
            <div key={String(o.value)}>
              {o.group && <div className={styles.selectGroup}>{o.group}</div>}
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={styles.selectOption}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span>
                  {o.label}
                  {o.hint && <small>{o.hint}</small>}
                </span>
                {o.value === value && <Icon name="check" size={18} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
