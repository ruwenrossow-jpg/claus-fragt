"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/admin/icons";
import { Select } from "@/components/admin/Select";
import { Switch } from "@/components/admin/Switch";
import { questionWarnings } from "@/lib/rules";
import { Question } from "@/lib/types";
import { QUESTION_TYPES, QuestionKind, isAnswerable, isInfo, kindOf, typeOf } from "@/question-types";
import styles from "./builder.module.css";

interface Props {
  question: Question;
  index: number;
  count: number;
  active: boolean;
  /** neu angelegt/dupliziert: Karte sanft in die Bildschirmmitte scrollen */
  center?: boolean;
  onActivate: () => void;
  /** aktive Karte zuklappen */
  onCollapse: () => void;
  onPatch: (patch: Partial<Question>) => void;
  onKind: (kind: QuestionKind) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const KIND_OPTIONS = QUESTION_TYPES.map((t) => ({ value: t.kind, label: t.label, hint: t.hint }));

/**
 * Eine Frage im Editor, wie bei Google Forms: inaktiv eine ruhige Zusammenfassung,
 * aktiv mit Fragetext, Frageart, den Feldern dieser Art und im Fuß Verschieben, Duplizieren, Löschen, Pflicht.
 */
export function QuestionCard({ question: q, index, count, active, center = false, onActivate, onCollapse, onPatch, onKind, onMove, onDuplicate, onRemove }: Props) {
  const def = typeOf(q);
  const info = isInfo(q);
  const card = useRef<HTMLElement>(null);
  const label = useRef<HTMLTextAreaElement>(null);
  // Aktiv geworden: am Laptop Cursor direkt in den Fragetext. Am Handy (Touch) nur bei neuen Karten – beim Aufklappen einer
  // bestehenden Frage soll nicht sofort die Tastatur aufgehen; die Karte rückt nur nach oben ins Bild.
  useEffect(() => {
    if (!active) return;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (!touch || center) {
      label.current?.focus({ preventScroll: true });
      const end = label.current?.value.length ?? 0;
      label.current?.setSelectionRange(end, end);
    }
    if (center) card.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    else if (touch) card.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [active, center]);

  if (!active) {
    const options = q.options.filter((o) => o.trim());
    return (
      <button type="button" className={`${styles.card} ${styles.summary}`} onClick={onActivate} data-question={index + 1}>
        <span className={styles.summaryLabel}>
          {q.label.trim() || <span className={styles.placeholder}>{info ? "Zwischenfolie ohne Text" : "Frage ohne Text"}</span>}
          {q.required && <span className={styles.required} aria-label="Pflicht"> *</span>}
        </span>
        <span className={styles.summaryMeta}>
          {def.label}
          {q.settings.tafel && " · An der Tafel"}
          {options.length > 0 && ` · ${options.join(" · ")}`}
        </span>
      </button>
    );
  }

  const warnings = questionWarnings(q);
  return (
    <section ref={card} className={`${styles.card} ${styles.cardActive}`} data-question={index + 1} aria-label={`Frage ${index + 1}`}>
      <button
        type="button"
        className={styles.collapseBar}
        aria-label="Zuklappen"
        data-collapse
        onClick={() => {
          (document.activeElement as HTMLElement | null)?.blur();
          onCollapse();
        }}
      >
        <span className={styles.grabber} />
      </button>
      <div className={styles.cardTop}>
        <textarea
          ref={label}
          className={styles.labelInput}
          value={q.label}
          placeholder={info ? "Überschrift (sagt Claus)" : "Frage"}
          aria-label="Fragetext"
          rows={1}
          onChange={(e) => onPatch({ label: e.target.value })}
        />
        <div className={styles.kind}>
          <span className={styles.fieldLabel}>Frageart</span>
          <Select label="Frageart" value={kindOf(q)} options={KIND_OPTIONS} onChange={onKind} />
        </div>
      </div>

      {def.Editor && (
        <div className={styles.cardBody}>
          <def.Editor question={q} onChange={onPatch} />
        </div>
      )}

      {q.settings.tafel && (
        <p className={styles.tafelNote}>
          <strong>An der Tafel:</strong> {isAnswerable(q) ? "Alle antworten gleichzeitig, am Beamer erscheinen die Balken." : "Alle antworten gleichzeitig, am Beamer wächst die Wortwolke."} Starte die Tafel über „Tafel“ oben.
        </p>
      )}

      {warnings.length > 0 && (
        <ul className={styles.hints}>
          {warnings.map((w) => <li key={w.text}>{w.text}</li>)}
        </ul>
      )}

      <footer className={styles.cardFoot}>
        <button
          type="button"
          className={`icon-btn ${styles.collapseFoot}`}
          aria-label="Zuklappen"
          onClick={() => {
            (document.activeElement as HTMLElement | null)?.blur();
            onCollapse();
          }}
        >
          <Icon name="chevronUp" />
        </button>
        <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Nach oben"><Icon name="up" /></button>
        <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Nach unten"><Icon name="down" /></button>
        <button type="button" className="icon-btn" onClick={onDuplicate} aria-label="Duplizieren"><Icon name="copy" /></button>
        <button type="button" className="icon-btn" onClick={onRemove} aria-label="Löschen"><Icon name="trash" /></button>
        {!info && (
          <>
            <span className={styles.footDivider} />
            <Switch label="An der Tafel" checked={Boolean(q.settings.tafel)} onChange={(on) => onPatch({ settings: { ...q.settings, tafel: on || undefined } })} />
            <span className={styles.footDivider} />
            <Switch label="Pflicht" checked={q.required} onChange={(required) => onPatch({ required })} />
          </>
        )}
      </footer>
    </section>
  );
}
