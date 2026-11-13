"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { getTheme } from "@/brand/themes";
import { AdminHeader } from "@/components/AdminHeader";
import { ConfigChips } from "@/components/builder/ConfigChips";
import { PreviewTabs } from "@/components/builder/PreviewTabs";
import { ShareDialog } from "@/components/builder/ShareDialog";
import { SlotCard } from "@/components/builder/SlotCard";
import { useFormDraft } from "@/components/builder/useFormDraft";
import styles from "@/components/builder/builder.module.css";
import { START, Step } from "@/components/survey/flow";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { FRAMEWORK_STEPS, STEP_KINDS, configOf, slotsFor } from "@/lib/framework";
import { formWarnings, scopeWarnings } from "@/lib/rules";
import { FormStatus, STATUS_LABELS } from "@/lib/types";
import { getType, isAnswerable, isPlayable } from "@/question-types";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const draft = useFormDraft(id);
  const { form, questions } = draft;
  const [step, setStep] = useState<Step>(START);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const wantsShare = useSearchParams().get("teilen") === "1";
  useEffect(() => {
    if (wantsShare) setSharing(true);
  }, [wantsShare]);

  if (!form) return <main className="admin-main">{draft.error ? <p className="error">{draft.error}</p> : <p className="muted">Lädt …</p>}</main>;

  const slots = slotsFor(configOf(form));
  const ansprache = form.settings?.ansprache ?? getTheme(form.style).ansprache;
  const playable = questions.filter(isPlayable);
  const warnings = formWarnings(form, questions);
  const umfang = scopeWarnings(questions);
  const previewIndex = (qid: string) => playable.findIndex((q) => q.id === qid);
  const activeId = step.kind === "question" ? playable[step.index]?.id : undefined;
  const focus = (qid: string) => {
    const i = previewIndex(qid);
    if (i >= 0 && qid !== activeId) setStep({ kind: "question", index: i });
  };

  async function setStatus(status: FormStatus) {
    await draft.save({ status });
  }

  const player = <SurveyPlayer form={form} questions={questions} step={step} onStepChange={setStep} />;
  const tabs = <PreviewTabs step={step} count={playable.length} hasResults={playable.some(isAnswerable)} onChange={setStep} />;
  const groups = [...FRAMEWORK_STEPS.map((s) => ({ step: s.step as number | null, name: s.name })), { step: null, name: "Ohne Bereich" }];

  return (
    <>
      <AdminHeader>
        <Link className="btn" href={`/b/${id}/ergebnisse`}>Ergebnisse</Link>
        <button type="button" className="btn" onClick={() => draft.save()} disabled={draft.saving || !draft.dirty}>
          {draft.saving ? "Speichert …" : draft.dirty ? "Speichern" : "Gespeichert ✓"}
        </button>
        <button type="button" className="btn primary" onClick={() => setSharing(true)}>Teilen</button>
      </AdminHeader>

      <main className="admin-main">
        <Link href="/meine-boegen" className="muted">← Meine Bögen</Link>
        {draft.error && <p className="error">{draft.error}</p>}

        <div className={styles.layout}>
          <div>
            <section className="panel">
              <div className="row spread">
                <strong>{STATUS_LABELS[form.status]} · {playable.length} Fragen im Bogen</strong>
                {draft.responseCount > 0 && <span className="badge">{draft.responseCount} Antworten</span>}
              </div>
              <label className="field-label">Wie heißt dein Event?</label>
              <input
                type="text"
                value={form.settings?.eventName ?? form.title}
                onChange={(e) => {
                  draft.patchSettings({ eventName: e.target.value });
                  draft.patchForm({ title: e.target.value });
                }}
                style={{ fontSize: 20, fontWeight: 700 }}
              />
              <label className="field-label">Thema (optional, ersetzt {"{thema}"})</label>
              <input type="text" value={form.settings?.thema ?? ""} onChange={(e) => draft.patchSettings({ thema: e.target.value || undefined })} />
              <ConfigChips form={form} onStyle={draft.setStyle} onTeach={draft.setTeach} onSettings={draft.patchSettings} />
              {umfang.length > 0 && <div className="warn"><ul>{umfang.map((w) => <li key={w.text}>{w.text}</li>)}</ul></div>}
              {form.status !== "draft" && draft.responseCount > 0 && (
                <div className={`warn ${styles.liveBanner}`}>
                  Es gibt schon {draft.responseCount} Antworten. Texte ändern ist ok – Plätze löschen oder Optionen ändern verfälscht die Auswertung.
                </div>
              )}
            </section>

            {groups.map(({ step: s, name }) => {
              const inStep = questions.filter((q) => q.step === s);
              if (s === null && !inStep.length) return null;
              return (
                <div key={String(s)}>
                  <div className={styles.stepHead}>
                    {s !== null && <span className={styles.stepNum}>{s}</span>}
                    <h2>{name}</h2>
                  </div>
                  {inStep.map((q, i) => (
                    <SlotCard
                      key={q.id}
                      form={form}
                      question={q}
                      slot={slots.find((sl) => sl.id === q.settings.slotId)}
                      ansprache={ansprache}
                      active={q.id === activeId}
                      canMoveUp={i > 0}
                      canMoveDown={i < inStep.length - 1}
                      onFocus={() => focus(q.id)}
                      onPatch={(p) => draft.patchQuestion(q.id, p)}
                      onKind={(k) => draft.changeKind(q.id, k)}
                      onMove={(d) => draft.move(q.id, d)}
                      onDuplicate={() => draft.duplicateQuestion(q.id)}
                      onRemove={() => {
                        if (draft.responseCount > 0 && !confirm(`Es gibt schon ${draft.responseCount} Antworten – Löschen verfälscht die Auswertung. Trotzdem löschen?`)) return;
                        draft.removeQuestion(q.id);
                        setStep(START);
                      }}
                    />
                  ))}
                  {s !== null && (
                    <div className={styles.addBar}>
                      <span className="muted">+ Frage in diesem Bereich:</span>
                      {STEP_KINDS[s].map((k) => (
                        <button key={k} type="button" className="btn small" onClick={() => draft.addQuestion(k, s)}>
                          {getType(k).label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
        {sharing && <ShareDialog form={form} warnings={warnings} busy={draft.saving} onStatus={setStatus} onClose={() => setSharing(false)} />}
      </main>
    </>
  );
}
