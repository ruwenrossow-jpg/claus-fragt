"use client";

import { useState } from "react";
import { QrCode, useQrDataUrl } from "@/components/QrCode";
import { Warning } from "@/lib/rules";
import { Form, FormStatus } from "@/lib/types";
import styles from "./builder.module.css";

interface Props {
  form: Form;
  warnings: Warning[];
  busy: boolean;
  onStatus: (status: FormStatus) => void;
  onClose: () => void;
}

/** Teilen wie bei Google Forms: Live schalten → kurzer Link + QR-Code (PNG, Beamer-Vollbild) → Status. */
export function ShareDialog({ form, warnings, busy, onStatus, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const slug = form.public_slug ?? form.id;
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/f/${slug}`;
  const png = useQrDataUrl(url);
  const isDraft = form.status === "draft";

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={`panel ${styles.modal}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Teilen">
        <div className="row spread">
          <h2>Teilen</h2>
          <button type="button" className="btn small" onClick={onClose}>Schließen ✕</button>
        </div>

        {isDraft && (
          <>
            {warnings.length > 0 && (
              <div className="warn">
                <strong>{warnings.length} Hinweise</strong> – du kannst trotzdem live schalten:
                <ul>{warnings.slice(0, 8).map((w) => <li key={w.text}>{w.text}</li>)}</ul>
              </div>
            )}
            <button type="button" className="btn primary big" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={busy} onClick={() => onStatus("published")}>
              {busy ? "Schaltet live …" : "Live schalten"}
            </button>
            <p className="muted">Erst danach funktionieren Link und QR-Code.</p>
          </>
        )}

        <div style={{ opacity: isDraft ? 0.4 : 1, pointerEvents: isDraft ? "none" : "auto" }}>
          <label className="field-label">Link</label>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn" onClick={copy}>{copied ? "Kopiert ✓" : "Kopieren"}</button>
          </div>
          <div className={styles.qrRow}>
            <QrCode text={url} size={180} />
            <div className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              {png && <a className="btn" href={png} download={`qr-${slug}.png`}>PNG herunterladen</a>}
              <a className="btn" href={`/f/${slug}/qr`} target="_blank" rel="noreferrer">Vollbild für den Beamer</a>
              <a className="btn" href={`/f/${slug}`} target="_blank" rel="noreferrer">Bogen öffnen</a>
            </div>
          </div>
          {!isDraft && (
            <div className="row">
              <span className="field-label" style={{ margin: 0 }}>Status</span>
              <button type="button" className={`btn small ${form.status === "published" ? "primary" : ""}`} onClick={() => onStatus("published")} disabled={busy}>Live</button>
              <button type="button" className={`btn small ${form.status === "closed" ? "primary" : ""}`} onClick={() => onStatus("closed")} disabled={busy}>Geschlossen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
