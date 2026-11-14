import { getTheme } from "@/brand/themes";
import { Form } from "@/lib/types";
import { ArtChoice } from "./ArtChoice";
import styles from "./builder.module.css";

/** Kopf des Bogens: Name, Beschreibung (Start-Screen) und Art (Inspirierend/Lernend). */
export function FormHeadCard({ form, onPatch }: { form: Form; onPatch: (patch: Partial<Form>) => void }) {
  return (
    <section className={`${styles.card} ${styles.headCard}`}>
      <input
        type="text"
        className={styles.titleInput}
        value={form.title}
        placeholder="Name des Bogens"
        maxLength={120}
        aria-label="Name des Bogens"
        // v1-Bögen nutzen settings.eventName für {event}: mitziehen, damit der Name überall stimmt
        onChange={(e) => onPatch({ title: e.target.value, ...(form.settings?.eventName !== undefined && { settings: { ...form.settings, eventName: e.target.value } }) })}
      />
      <textarea
        className={styles.descInput}
        value={form.description ?? ""}
        placeholder="Beschreibung (erscheint auf dem Start-Screen)"
        aria-label="Beschreibung"
        rows={1}
        onChange={(e) => onPatch({ description: e.target.value || null })}
      />
      <ArtChoice value={getTheme(form.style).id} onChange={(style) => onPatch({ style })} compact />
    </section>
  );
}
