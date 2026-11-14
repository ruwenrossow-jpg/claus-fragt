import styles from "./inputs.module.css";

interface Props {
  items: { key: string; label: string; suffix?: React.ReactNode }[];
  isOn: (key: string) => boolean;
  onToggle: (key: string) => void;
  square?: boolean;
  /** Fragetext (Name der Gruppe für Screenreader) */
  label?: string;
}

/** Liste mit runden (Einfach) oder eckigen (Mehrfach) Markierungen, wie im Prototyp. */
export function ChoiceList({ items, isOn, onToggle, square = false, label }: Props) {
  return (
    <div className={styles.options} role={square ? "group" : "radiogroup"} aria-label={label}>
      {items.map((it, i) => (
        <button key={`${i}-${it.key}`} type="button" role={square ? "checkbox" : "radio"} aria-checked={isOn(it.key)} className={styles.option} onClick={() => onToggle(it.key)}>
          <span className={`${styles.mark} ${square ? styles.markSquare : ""} ${isOn(it.key) ? styles.markOn : ""}`} aria-hidden />
          <span className={styles.optionLabel}>{it.label}</span>
          {it.suffix}
        </button>
      ))}
    </div>
  );
}
