import { CloudWord, middleOut } from "@/lib/wordcloud";
import styles from "./tafel.module.css";

const TONES = [styles.tone1, styles.tone2, styles.tone3, styles.tone4];

/** Wortwolke für den Beamer: Größe = Häufigkeit, die häufigsten Begriffe in der Mitte. Neue Begriffe wachsen sanft hinein. */
export function WordCloud({ words }: { words: CloudWord[] }) {
  if (!words.length) return null;
  const max = words[0].count;
  return (
    <div className={styles.cloud} data-cloud>
      {middleOut(words).map((w) => {
        const rank = words.indexOf(w);
        // 1 (selten) … 4.2 (häufigster): Wurzel, damit ein Ausreißer nicht alles andere winzig macht
        const scale = 1 + 3.2 * Math.sqrt((w.count - 1) / Math.max(1, max - 1));
        return (
          <span key={w.text.toLowerCase()} className={`${styles.word} ${TONES[rank % TONES.length]}`} style={{ "--scale": max === 1 ? 1.6 : scale } as React.CSSProperties} data-word={w.text} data-count={w.count}>
            {w.text}
          </span>
        );
      })}
    </div>
  );
}
