import { fillVars, Slot } from "@/lib/framework";
import { TONE_TIPS, questionWarnings, wordCount } from "@/lib/rules";
import { Ansprache, Form, MascotSide, Question } from "@/lib/types";
import { QUESTION_TYPES, QuestionKind, kindOf, typeOf } from "@/question-types";
import { OptionsEditor } from "@/question-types/OptionsEditor";
import styles from "./builder.module.css";

interface Props {
  form: Form;
  question: Question;
  slot?: Slot;
  ansprache: Ansprache;
  active: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onFocus: () => void;
  onPatch: (patch: Partial<Question>) => void;
  onKind: (kind: QuestionKind) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const KPI_LABEL = { transfer: "KPI Transfer", ziel: "KPI Ziel", teach: "KPI Teach" } as const;

/**
 * Ein Platz im Editor: Schreiben statt Konfigurieren. Sichtbar sind nur Fragetext (+ Beispiel) und Antworten;
 * alles Weitere liegt unter „Anpassen“.
 */
export function SlotCard({ form, question: q, slot, ansprache, active, canMoveUp, canMoveDown, onFocus, onPatch, onKind, onMove, onDuplicate, onRemove }: Props) {
  const def = typeOf(q);
  const kind = kindOf(q);
  const beispiel = slot ? fillVars(slot.beispiel[ansprache], form) : "Deine Frage";
  const warnings = questionWarnings(q, slot);
  const words = wordCount(q.label);
  const fixedLevels = Boolean(slot?.levels) && kind === "levels";
  const setSettings = (patch: Partial<Question["settings"]>) => onPatch({ settings: { ...q.settings, ...patch } });
  const choiceLike = q.type === "single_choice" || q.type === "multiple_choice";

  return (
    <section className={`panel ${styles.question} ${active ? styles.questionActive : ""}`} onFocusCapture={onFocus}>
      <div className={styles.qHead}>
        <span className={styles.qTitle}>{slot?.name ?? "Eigene Frage"}</span>
        <span className="row">
          {q.required && <span className="badge req">Pflicht</span>}
          {q.settings.kpi && <span className="badge kpi">{KPI_LABEL[q.settings.kpi]}</span>}
          <span className="badge">{def.label}</span>
        </span>
      </div>
      {slot && <p className="muted" style={{ margin: "6px 0 0" }}>{slot.ziel}</p>}

      <input type="text" value={q.label} placeholder={beispiel} onChange={(e) => onPatch({ label: e.target.value })} style={{ marginTop: 10, fontSize: 17 }} aria-label="Fragetext" />
      <div className={styles.metaRow}>
        <span className={words > 10 ? "error" : "muted"}>{words}/10 Wörter</span>
        {slot && q.label !== beispiel && (
          <button type="button" className="link" onClick={() => onPatch({ label: beispiel })}>Beispiel übernehmen</button>
        )}
      </div>
      {active && <p className={styles.tips}>Tipps: {TONE_TIPS.join(" · ")}</p>}

      {fixedLevels ? (
        <p className={styles.levels}>
          {q.options.map((o, i) => <span key={i}>{i + 1} {o}</span>)}
          <em className="muted"> – feste Stufen (KPI), änderbar unter „Anpassen“</em>
        </p>
      ) : (
        choiceLike && def.Editor && (
          <div style={{ marginTop: 10 }}>
            <def.Editor question={q} onChange={onPatch} />
          </div>
        )
      )}

      {warnings.length > 0 && (
        <div className="warn">
          <ul>{warnings.map((w) => <li key={w.text}>{w.text}</li>)}</ul>
        </div>
      )}

      <details className={styles.adjust}>
        <summary>Anpassen</summary>
        <div className={styles.grid2}>
          <div>
            <label className="field-label">Fragetyp</label>
            <select value={kind} onChange={(e) => onKind(e.target.value as QuestionKind)}>
              {QUESTION_TYPES.map((t) => <option key={t.kind} value={t.kind}>{t.label}</option>)}
            </select>
            {q.settings.kpi && <p className="muted">Achtung: Ohne Stufen kein {KPI_LABEL[q.settings.kpi]}.</p>}
          </div>
          <div>
            <label className="field-label">Claus steht</label>
            <select value={q.settings.mascotSide ?? "auto"} onChange={(e) => setSettings({ mascotSide: e.target.value as MascotSide })}>
              <option value="auto">automatisch</option>
              <option value="left">links</option>
              <option value="right">rechts</option>
            </select>
          </div>
          <div>
            <label className="field-label">Überschrift der Antwort-Box</label>
            <input type="text" value={q.settings.boxTitle ?? ""} placeholder="(keine)" onChange={(e) => setSettings({ boxTitle: e.target.value || undefined })} />
          </div>
          <div>
            <label className="field-label">Hinweis unter der Frage</label>
            <input type="text" value={q.help_text ?? ""} onChange={(e) => onPatch({ help_text: e.target.value || null })} />
          </div>
        </div>
        {fixedLevels && (
          <>
            <label className="field-label">Stufen ändern (macht den KPI unvergleichbar)</label>
            <OptionsEditor question={q} onChange={onPatch} />
          </>
        )}
        {!choiceLike && def.Editor && (
          <>
            <label className="field-label">Antworten</label>
            <def.Editor question={q} onChange={onPatch} />
          </>
        )}
        <label className="row" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={q.required} onChange={(e) => onPatch({ required: e.target.checked })} /> Pflichtfrage
        </label>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn small" onClick={() => onMove(-1)} disabled={!canMoveUp}>↑ nach oben</button>
          <button type="button" className="btn small" onClick={() => onMove(1)} disabled={!canMoveDown}>↓ nach unten</button>
          <button type="button" className="btn small" onClick={onDuplicate}>Duplizieren</button>
          <button type="button" className="btn small danger" onClick={onRemove}>Entfernen</button>
        </div>
      </details>
    </section>
  );
}
