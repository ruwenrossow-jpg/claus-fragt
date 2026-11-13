import { FRAMEWORK_STEPS } from "@/lib/framework";
import { MascotSide, Question } from "@/lib/types";
import { QUESTION_TYPES, QuestionKind, kindOf, typeOf } from "@/question-types";
import styles from "./builder.module.css";

interface Props {
  question: Question;
  index: number;
  count: number;
  active: boolean;
  onFocus: () => void;
  onPatch: (patch: Partial<Question>) => void;
  onKind: (kind: QuestionKind) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

/** Eine Frage im Builder. Typ-spezifische Felder kommen aus der Fragetyp-Registry. */
export function QuestionEditor({ question: q, index, count, active, onFocus, onPatch, onKind, onMove, onDuplicate, onRemove }: Props) {
  const def = typeOf(q);
  const setSettings = (patch: Partial<Question["settings"]>) => onPatch({ settings: { ...q.settings, ...patch } });

  return (
    <section className={`panel ${styles.question} ${active ? styles.questionActive : ""}`} onFocusCapture={onFocus}>
      <div className={styles.qHead}>
        <span className={styles.qTitle}>Frage {index + 1} · {def.label}</span>
        <div className="row">
          <button type="button" className="btn small" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Nach oben">↑</button>
          <button type="button" className="btn small" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Nach unten">↓</button>
          <button type="button" className="btn small" onClick={onDuplicate}>Duplizieren</button>
          <button type="button" className="btn small danger" onClick={onRemove}>Entfernen</button>
        </div>
      </div>

      <label className="field-label">Frage (steht in Claus’ Sprechblase)</label>
      <input type="text" value={q.label} placeholder="Hier könnte Ihre Frage stehen" onChange={(e) => onPatch({ label: e.target.value })} />

      <div className={styles.grid2}>
        <div>
          <label className="field-label">Fragetyp</label>
          <select value={kindOf(q)} onChange={(e) => onKind(e.target.value as QuestionKind)}>
            {QUESTION_TYPES.map((t) => <option key={t.kind} value={t.kind}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Framework-Schritt</label>
          <select value={q.step ?? ""} onChange={(e) => onPatch({ step: e.target.value ? Number(e.target.value) : null })}>
            <option value="">–</option>
            {FRAMEWORK_STEPS.map((s) => <option key={s.step} value={s.step}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Überschrift der Antwort-Box</label>
          <input type="text" value={q.settings.boxTitle ?? ""} placeholder={def.defaultBoxTitle || "(keine)"} onChange={(e) => setSettings({ boxTitle: e.target.value || undefined })} />
        </div>
        <div>
          <label className="field-label">Claus steht</label>
          <select value={q.settings.mascotSide ?? "auto"} onChange={(e) => setSettings({ mascotSide: e.target.value as MascotSide })}>
            <option value="auto">automatisch (abwechselnd)</option>
            <option value="left">links</option>
            <option value="right">rechts</option>
          </select>
        </div>
      </div>

      {def.Editor && (
        <>
          <label className="field-label">Antworten</label>
          <def.Editor question={q} onChange={onPatch} />
        </>
      )}

      <label className="field-label">Hinweis unter der Frage (optional)</label>
      <input type="text" value={q.help_text ?? ""} onChange={(e) => onPatch({ help_text: e.target.value || null })} />

      <label className="row" style={{ marginTop: 12 }}>
        <input type="checkbox" checked={q.required} onChange={(e) => onPatch({ required: e.target.checked })} /> Pflichtfrage
      </label>
    </section>
  );
}
