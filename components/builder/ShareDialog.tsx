"use client";

import Link from "next/link";
import { Modal, useDialog } from "@/components/admin/Dialog";
import { Icon } from "@/components/admin/icons";
import { QrCode, useQrDataUrl } from "@/components/QrCode";
import { Warning } from "@/lib/rules";
import { Form, FormStatus } from "@/lib/types";
import styles from "./builder.module.css";

interface Props {
  form: Form;
  warnings: Warning[];
  onStatus: (status: FormStatus) => void;
  onClose: () => void;
  /** Anzahl der Tafel-Fragen (0 = kein Tafel-Hinweis) */
  tafelCount?: number;
}

/** Teilen wie bei Google Forms: Live schalten → kurzer Link + QR-Code (PNG, Beamer-Vollbild) → Status. */
export function ShareDialog({ form, warnings, onStatus, onClose, tafelCount = 0 }: Props) {
  const dialog = useDialog();
  const slug = form.public_slug ?? form.id;
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/f/${slug}`;
  const png = useQrDataUrl(url);
  const isDraft = form.status === "draft";

  function copy() {
    navigator.clipboard.writeText(url).then(
      () => dialog.toast("Link kopiert"),
      () => dialog.toast("Kopieren ging nicht – bitte den Link markieren.", "error")
    );
  }

  return (
    <Modal onClose={onClose} label="Teilen">
      <div className={styles.modalHead}>
        <h2>Teilen</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen"><Icon name="close" /></button>
      </div>

      {isDraft ? (
        <div className={styles.shareDraft}>
          <p>Der Bogen ist noch ein Entwurf. Erst nach dem Live schalten funktionieren Link und QR-Code.</p>
          {warnings.length > 0 && (
            <div className="warn">
              <strong>Hinweise</strong> – du kannst trotzdem live schalten:
              <ul>{warnings.slice(0, 6).map((w) => <li key={w.text}>{w.text}</li>)}</ul>
            </div>
          )}
          <button type="button" className="btn primary big wide" onClick={() => onStatus("published")}>Live schalten</button>
        </div>
      ) : (
        <div className={styles.statusRow}>
          <span>Status</span>
          <div className={styles.segmented} role="radiogroup" aria-label="Status">
            {(["published", "closed"] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={form.status === s} className={styles.segment} onClick={() => onStatus(s)}>
                {s === "published" ? "Live" : "Geschlossen"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={isDraft ? styles.shareLocked : undefined} aria-hidden={isDraft}>
        <label className="field-label" htmlFor="share-link">Link</label>
        <div className={styles.linkRow}>
          <input id="share-link" type="text" readOnly value={url} onFocus={(e) => e.target.select()} tabIndex={isDraft ? -1 : 0} />
          <button type="button" className="btn" onClick={copy} tabIndex={isDraft ? -1 : 0}>Kopieren</button>
        </div>
        <div className={styles.qrRow}>
          <QrCode text={url} size={168} className={styles.qr} />
          <div className={styles.qrActions}>
            {png && <a className="btn" href={png} download={`qr-${slug}.png`} tabIndex={isDraft ? -1 : 0}>QR-Code als PNG</a>}
            <a className="btn" href={`/f/${slug}/qr`} target="_blank" rel="noreferrer" tabIndex={isDraft ? -1 : 0}>Vollbild für den Beamer</a>
            <a className="btn ghost" href={`/f/${slug}`} target="_blank" rel="noreferrer" tabIndex={isDraft ? -1 : 0}>Bogen öffnen</a>
          </div>
        </div>
      </div>

      {tafelCount > 0 && (
        <div className={styles.shareTafel}>
          <span>{tafelCount === 1 ? "1 Frage läuft" : `${tafelCount} Fragen laufen`} gemeinsam an der Tafel.</span>
          <a className="btn" href={`/b/${form.id}/tafel/steuerung`} target="_blank" rel="noreferrer" data-tafel-open>Tafel starten</a>
        </div>
      )}

      <div className={styles.shareFoot}>
        <button type="button" className="btn ghost" onClick={onClose}>Weiter bearbeiten</button>
        <Link className="btn primary" href="/meine-boegen" data-to-list><Icon name="back" size={18} /> Zu meinen Bögen</Link>
      </div>
    </Modal>
  );
}
