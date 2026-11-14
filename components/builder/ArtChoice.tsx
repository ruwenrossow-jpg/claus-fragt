import { THEMES, ThemeId } from "@/brand/themes";
import styles from "./builder.module.css";

/** Die eine Wahl beim Anlegen: Inspirierend oder Lernend. compact = kleine Umschaltung im Editor. */
export function ArtChoice({ value, onChange, compact = false }: { value: ThemeId; onChange: (id: ThemeId) => void; compact?: boolean }) {
  return (
    <div className={compact ? styles.segmented : styles.artTiles} role="radiogroup" aria-label="Art des Events">
      {THEMES.map((t) => (
        <button key={t.id} type="button" role="radio" aria-checked={t.id === value} className={compact ? styles.segment : styles.artTile} onClick={() => onChange(t.id)}>
          <strong>{t.name}</strong>
          {!compact && <span>{t.hint}</span>}
        </button>
      ))}
    </div>
  );
}
