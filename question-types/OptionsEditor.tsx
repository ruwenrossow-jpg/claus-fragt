import { EditorProps } from "./types";
import { letter } from "./letters";
import styles from "./editors.module.css";

/** Antwortoptionen bearbeiten (Einfach-/Mehrfachauswahl). */
export function OptionsEditor({ question, onChange }: EditorProps) {
  const opts = question.options;
  const set = (options: string[]) => onChange({ options });
  return (
    <div>
      {opts.map((o, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.marker}>{letter(i)}</span>
          <input type="text" value={o} placeholder={`Antwort ${letter(i)}`} onChange={(e) => set(opts.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="btn small" onClick={() => set(opts.filter((_, j) => j !== i))} aria-label="Option entfernen">✕</button>
        </div>
      ))}
      <button type="button" className="btn small" style={{ marginTop: 8 }} onClick={() => set([...opts, ""])}>+ Antwort</button>
    </div>
  );
}
