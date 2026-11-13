"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { THEMES } from "@/brand/themes";
import { COPY } from "@/brand/copy";
import { AdminHeader } from "@/components/AdminHeader";
import { PreviewTabs } from "@/components/builder/PreviewTabs";
import { QuestionEditor } from "@/components/builder/QuestionEditor";
import { useFormDraft } from "@/components/builder/useFormDraft";
import styles from "@/components/builder/builder.module.css";
import { START, Step } from "@/components/survey/flow";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { FormStatus, STATUS_LABELS } from "@/lib/types";
import { QUESTION_TYPES, isAnswerable } from "@/question-types";

export default function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const draft = useFormDraft(id);
  const { form, questions } = draft;
  const [step, setStep] = useState<Step>(START);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!form) return <main className="admin-main">{draft.error ? <p className="error">{draft.error}</p> : <p className="muted">Lädt …</p>}</main>;

  const activeIndex = step.kind === "question" ? step.index : -1;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/f/${id}` : `/f/${id}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const player = <SurveyPlayer form={form} questions={questions} step={step} onStepChange={setStep} />;
  const tabs = <PreviewTabs step={step} count={questions.length} hasResults={questions.some(isAnswerable)} onChange={setStep} />;

  return (
    <>
      <AdminHeader>
        <Link className="btn" href={`/forms/${id}/results`}>Auswertung</Link>
        <button type="button" className="btn" onClick={copyLink}>{copied ? "Link kopiert ✓" : "Link kopieren"}</button>
        <button type="button" className="btn primary" onClick={draft.save} disabled={draft.saving || !draft.dirty}>
          {draft.saving ? "Speichert …" : draft.dirty ? "Speichern" : "Gespeichert ✓"}
        </button>
      </AdminHeader>

      <main className="admin-main">
        <Link href="/" className="muted">← Alle Bögen</Link>
        {draft.error && <p className="error">{draft.error}</p>}

        <div className={styles.layout}>
          <div>
            <section className="panel">
              <label className="field-label">Titel (nur intern)</label>
              <input type="text" value={form.title} onChange={(e) => draft.patchForm({ title: e.target.value })} style={{ fontSize: 20, fontWeight: 700 }} />

              <label className="field-label">Begrüßung in der Start-Sprechblase</label>
              <textarea
                value={form.description ?? ""}
                placeholder={COPY.startBubble}
                onFocus={() => setStep(START)}
                onChange={(e) => draft.patchForm({ description: e.target.value || null })}
              />
              <p className="muted">Leer lassen für den Standardtext. {"{anzahl}"} wird durch die Zahl der Fragen ersetzt.</p>

              <div className="row">
                <div>
                  <label className="field-label">Status</label>
                  <select value={form.status} onChange={(e) => draft.patchForm({ status: e.target.value as FormStatus })}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Stil</label>
                  <select value={form.style ?? THEMES[0].id} onChange={(e) => draft.patchForm({ style: e.target.value })}>
                    {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {questions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={i}
                count={questions.length}
                active={i === activeIndex}
                onFocus={() => i !== activeIndex && setStep({ kind: "question", index: i })}
                onPatch={(p) => draft.patchQuestion(q.id, p)}
                onKind={(k) => draft.changeKind(q.id, k)}
                onMove={(d) => {
                  draft.move(q.id, d);
                  setStep({ kind: "question", index: Math.max(0, Math.min(questions.length - 1, i + d)) });
                }}
                onDuplicate={() => draft.duplicateQuestion(q.id)}
                onRemove={() => {
                  draft.removeQuestion(q.id);
                  setStep(START);
                }}
              />
            ))}

            <section className="panel">
              <strong>Frage hinzufügen</strong>
              <div className={styles.addBar}>
                {QUESTION_TYPES.map((t) => (
                  <button key={t.kind} type="button" className="btn small" onClick={() => setStep({ kind: "question", index: draft.addQuestion(t.kind) })}>
                    + {t.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.previewCol}>
            {tabs}
            <div className={styles.phone}>{player}</div>
          </aside>
        </div>

        <button type="button" className={`btn primary ${styles.mobilePreviewBtn}`} onClick={() => setMobilePreview(true)}>
          Vorschau
        </button>
        {mobilePreview && (
          <div className={styles.overlay}>
            <div className={styles.overlayBar}>
              {tabs}
              <button type="button" className="btn small" onClick={() => setMobilePreview(false)}>Schließen ✕</button>
            </div>
            <div className={styles.overlayBody}>{player}</div>
          </div>
        )}
      </main>
    </>
  );
}
