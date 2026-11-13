import { Step } from "@/components/survey/flow";
import styles from "./builder.module.css";

/** Schnellsprung in der Vorschau: Start, jede Frage, Ende, Ergebnis. */
export function PreviewTabs({ step, count, hasResults, onChange }: { step: Step; count: number; hasResults: boolean; onChange: (s: Step) => void }) {
  const tabs: { label: string; step: Step }[] = [
    { label: "Start", step: { kind: "start" } },
    ...Array.from({ length: count }, (_, i) => ({ label: `F${i + 1}`, step: { kind: "question", index: i } as Step })),
    { label: "Ende", step: { kind: "over" } },
    ...(hasResults ? [{ label: "Ergebnis", step: { kind: "result", index: 0 } as Step }] : []),
  ];
  const same = (a: Step, b: Step) => a.kind === b.kind && ("index" in a ? a.index : 0) === ("index" in b ? b.index : 0);
  return (
    <div className={styles.previewTabs}>
      {tabs.map((t) => (
        <button key={t.label} type="button" className={`${styles.tab} ${same(t.step, step) ? styles.tabOn : ""}`} onClick={() => onChange(t.step)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
