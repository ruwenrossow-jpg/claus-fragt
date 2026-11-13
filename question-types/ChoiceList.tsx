import styles from "./inputs.module.css";

/** Liste mit runden (Einfach) oder eckigen (Mehrfach) Markierungen, wie im Prototyp. */
export function ChoiceList({ items, isOn, onToggle, square = false }: { items: { key: string; label: string; suffix?: React.ReactNode }[]; isOn: (key: string) => boolean; onToggle: (key: string) => void; square?: boolean }) {
  return (
    <div className={styles.options} role={square ? "group" : "radiogroup"}>
      {items.map((it) => (
        <button key={it.key} type="button" role={square ? "checkbox" : "radio"} aria-checked={isOn(it.key)} className={styles.option} onClick={() => onToggle(it.key)}>
          <span className={`${styles.mark} ${square ? styles.markSquare : ""} ${isOn(it.key) ? styles.markOn : ""}`} />
          {it.label}
          {it.suffix}
        </button>
      ))}
    </div>
  );
}
