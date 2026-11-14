"use client";

import { Icon } from "@/components/admin/icons";
import { Select } from "@/components/admin/Select";
import { Switch } from "@/components/admin/Switch";
import { questionWarnings } from "@/lib/rules";
import { Question } from "@/lib/types";
import { QUESTION_TYPES, QuestionKind, kindOf, typeOf } from "@/question-types";
import styles from "./builder.module.css";

interface Props {
  question: Question;
  index: number;
  count: number;
  active: boolean;
  onActivate: () => void;
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
export function QuestionCard({ question: q, index, count, active, onActivate, onPatch, onKind, onMove, onDuplicate, onRemove }: Props) {
  const def = typeOf(q);

  if (!active) {
    const options = q.options.filter((o) => o.trim());
    return (
      <button type="button" className={`${styles.card} ${styles.summary}`} onClick={onActivate} data-question={index + 1}>
        <span className={styles.summaryLabel}>
          {q.label.trim() || <span className={styles.placeholder}>Frage ohne Text</span>}
          {q.required && <span className={styles.required} aria-label="Pflicht"> *</span>}
        </span>
        <span className={styles.summaryMeta}>
          {def.label}
          {options.length > 0 && ` · ${options.join(" · ")}`}
        </span>
      </button>
    );
  }

  const warnings = questionWarnings(q);
  return (
    <section className={`${styles.card} ${styles.cardActive}`} data-question={index + 1} aria-label={`Frage ${index + 1}`}>
      <div className={styles.cardTop}>
        <textarea
          className={styles.labelInput}
          value={q.label}
          placeholder="Frage"
          aria-label="Fragetext"
          rows={1}
          autoFocus
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

      {warnings.length > 0 && (
        <ul className={styles.hints}>
          {warnings.map((w) => <li key={w.text}>{w.text}</li>)}
        </ul>
      )}

      <footer className={styles.cardFoot}>
        <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Nach oben"><Icon name="up" /></button>
        <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Nach unten"><Icon name="down" /></button>
        <button type="button" className="icon-btn" onClick={onDuplicate} aria-label="Duplizieren"><Icon name="copy" /></button>
        <button type="button" className="icon-btn" onClick={onRemove} aria-label="Löschen"><Icon name="trash" /></button>
        <span className={styles.footDivider} />
        <Switch label="Pflicht" checked={q.required} onChange={(required) => onPatch({ required })} />
      </footer>
    </section>
  );
}
