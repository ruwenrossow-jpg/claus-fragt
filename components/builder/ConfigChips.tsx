import { STYLES, StyleId, getEventType } from "@/lib/styles";
import { Ansprache, Form } from "@/lib/types";
import styles from "./builder.module.css";

interface Props {
  form: Form;
  onStyle: (style: StyleId) => void;
  onTeach: (teach: boolean) => void;
  onSettings: (patch: { menti?: boolean; ansprache?: Ansprache }) => void;
}

/** Vorauswahl aus dem Event-Typ als kleine, änderbare Chips. */
export function ConfigChips({ form, onStyle, onTeach, onSettings }: Props) {
  const s = form.settings ?? {};
  return (
    <div className={styles.chips}>
      <span className={styles.chip}>{getEventType(s.eventTyp).name}</span>
      <label className={styles.chip}>
        Style
        <select value={form.style ?? "inspire"} onChange={(e) => onStyle(e.target.value as StyleId)}>
          {Object.values(STYLES).map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
        </select>
      </label>
      <label className={styles.chip}>
        Ansprache
        <select value={s.ansprache ?? "du"} onChange={(e) => onSettings({ ansprache: e.target.value as Ansprache })}>
          <option value="du">du</option>
          <option value="Sie">Sie</option>
        </select>
      </label>
      <label className={styles.chip}>
        <input type="checkbox" checked={Boolean(s.teach)} onChange={(e) => onTeach(e.target.checked)} /> Teach
      </label>
      <label className={styles.chip} title="Menti-Start (Beamer) folgt in P3">
        <input type="checkbox" checked={Boolean(s.menti)} onChange={(e) => onSettings({ menti: e.target.checked })} /> Menti-Start
      </label>
    </div>
  );
}
