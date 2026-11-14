"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AdminHeader } from "@/components/AdminHeader";
import { useDialog } from "@/components/admin/Dialog";
import { Icon } from "@/components/admin/icons";
import { PageState } from "@/components/admin/PageState";
import { AblaufIdee } from "@/components/builder/AblaufIdee";
import { FormHeadCard } from "@/components/builder/FormHeadCard";
import { PreviewTabs } from "@/components/builder/PreviewTabs";
import { QuestionCard } from "@/components/builder/QuestionCard";
import { SaveStatus } from "@/components/builder/SaveStatus";
import { ShareDialog } from "@/components/builder/ShareDialog";
import { useFormDraft } from "@/components/builder/useFormDraft";
import styles from "@/components/builder/builder.module.css";
import { playableQuestions } from "@/components/survey/context";
import { START, Step } from "@/components/survey/flow";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { formWarnings } from "@/lib/rules";
import { STATUS_LABELS, isTrashed } from "@/lib/types";
import { isAnswerable, withPreviewPlaceholders } from "@/question-types";

/** Editor wie Google Forms: Kopf-Karte, Fragen Schritt für Schritt hinzufügen, Autosave, Live-Vorschau im Handy-Rahmen. */
export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const dialog = useDialog();
  const draft = useFormDraft(id);
  const { form, questions } = draft;
  const [step, setStep] = useState<Step>(START);
  const [activeId, setActiveId] = useState<string | null>(null);
  /** zuletzt angelegte/duplizierte Frage → wird zentriert */
  const [centerId, setCenterId] = useState<string | null>(null);
  /** zählt hoch bei „Vorschau von vorne“ → SurveyPlayer wird neu aufgebaut (Antworten weg) */
  const [previewRun, setPreviewRun] = useState(0);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const wantsShare = useSearchParams().get("teilen") === "1";
  useEffect(() => {
    if (wantsShare) setSharing(true);
  }, [wantsShare]);

  // Vorschau: die aktive Frage erscheint auch ohne Text/Antworten (Platzhalter), damit die Vorschau sofort mitspringt
  const previewQuestions = useMemo(() => questions.map((q) => (q.id === activeId ? withPreviewPlaceholders(q) : q)), [questions, activeId]);
  const playable = useMemo(() => (form ? playableQuestions(form, previewQuestions) : []), [form, previewQuestions]);
  const previewIndex = playable.findIndex((q) => q.id === activeId);
  // Die Vorschau folgt der aktiven Frage, sobald sie im Bogen erscheint (Tabs bleiben frei wählbar)
  useEffect(() => {
    if (previewIndex >= 0) setStep({ kind: "question", index: previewIndex });
  }, [activeId, previewIndex]);

  const tafelCount = playable.filter((q) => q.settings.tafel).length;
  if (!form) return <PageState error={draft.loadError} onRetry={draft.reload} />;

  async function remove(qid: string) {
    if (draft.responseCount > 0) {
      const ok = await dialog.confirm({
        title: "Frage löschen?",
        text: `Es gibt schon ${draft.responseCount} Antworten. Die Antworten auf diese Frage gehen dabei verloren.`,
        confirmLabel: "Löschen",
        danger: true,
      });
      if (!ok) return;
    }
    const i = questions.findIndex((q) => q.id === qid);
    draft.removeQuestion(qid);
    setActiveId(questions[i + 1]?.id ?? questions[i - 1]?.id ?? null);
    setStep(START);
    dialog.toast("Frage gelöscht");
  }

  const focusNew = (qid: string) => {
    setActiveId(qid);
    setCenterId(qid);
  };
  /** Haupt-CTA: sofort speichern (Autosave läuft weiter) und den Teilen-Dialog mit „Live schalten“ öffnen. */
  async function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      await draft.saveNow();
    } finally {
      setFinishing(false);
    }
    setSharing(true);
  }
  const restartPreview = () => {
    setPreviewRun((n) => n + 1);
    setStep(START);
  };

  const player = <SurveyPlayer key={previewRun} form={form} questions={previewQuestions} step={step} onStepChange={setStep} onExit={restartPreview} />;
  const restart = (
    <button type="button" className={`btn small ${styles.restart}`} onClick={restartPreview} data-restart>
      <Icon name="restart" size={16} /> Von vorne
    </button>
  );
  const tabs = <PreviewTabs step={step} count={playable.length} hasResults={playable.some(isAnswerable)} onChange={setStep} />;

  return (
    <>
      <AdminHeader>
        <SaveStatus state={draft.saveState} onRetry={draft.retry} />
        <Link className="btn ghost" href="/meine-boegen" aria-label="Meine Bögen" data-header-list><Icon name="list" size={18} /> <span className="hide-mobile">Meine Bögen</span></Link>
        <Link className="btn ghost hide-xs" href={`/b/${id}/ergebnisse`} aria-label="Ergebnisse"><Icon name="chart" size={18} /> <span className="hide-mobile">Ergebnisse</span></Link>
        {tafelCount > 0 && (
          <a className="btn ghost" href={`/b/${id}/tafel/steuerung`} target="_blank" rel="noreferrer" aria-label="Tafel starten" data-header-tafel><Icon name="board" size={18} /> <span className="hide-mobile">Tafel</span></a>
        )}
        <button type="button" className="btn" onClick={() => setSharing(true)} aria-label="Teilen" data-share><Icon name="share" size={18} /> <span className="hide-mobile">Teilen</span></button>
        <button type="button" className="btn primary" onClick={finish} disabled={finishing} data-cta>
          <Icon name="check" size={18} /> <span className="hide-mobile">Speichern &amp; abschließen</span><span className="only-mobile">Abschließen</span>
        </button>
      </AdminHeader>

      <main className="admin-main">
        <div className={styles.topLine}>
          <Link href="/meine-boegen" className="back-link"><Icon name="back" size={18} /> Meine Bögen</Link>
          <span className={`status-pill status-${form.status}`}>{STATUS_LABELS[form.status]}</span>
          {draft.responseCount > 0 && <span className="muted">{draft.responseCount} {draft.responseCount === 1 ? "Antwort" : "Antworten"}</span>}
        </div>
        {draft.error && <p className="warn" role="alert">{draft.error}</p>}
        {isTrashed(form) && (
          <div className={`warn ${styles.trashNotice}`} role="status">
            <span>Dieser Bogen liegt im Papierkorb. Sein Link ist aus, bis du ihn wiederherstellst.</span>
            <button type="button" className="btn small" onClick={() => draft.patchForm({ settings: { ...form.settings, geloescht: null } }, true)}>
              <Icon name="restart" size={16} /> Wiederherstellen
            </button>
          </div>
        )}

        <div className={styles.layout}>
          <div className={styles.cards}>
            <FormHeadCard form={form} onPatch={(p) => draft.patchForm(p)} />
            <AblaufIdee
              style={form.style}
              questions={questions}
              onAdd={(v, step) =>
                focusNew(
                  draft.addSuggested(v.kind, {
                    label: v.label,
                    step,
                    ...(v.options && { options: [...v.options] }),
                    ...((v.kpi || v.maxChoices) && { settings: { ...(v.kpi && { kpi: v.kpi }), ...(v.maxChoices && { maxChoices: v.maxChoices }) } }),
                  })
                )
              }
            />

            {questions.length === 0 && <p className={styles.empty}>Noch keine Fragen. Füge die erste hinzu – Schritt für Schritt.</p>}
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                count={questions.length}
                active={q.id === activeId}
                center={q.id === centerId}
                onActivate={() => setActiveId(q.id)}
                onPatch={(p) => draft.patchQuestion(q.id, p)}
                onKind={(k) => draft.changeKind(q.id, k)}
                onMove={(d) => draft.move(q.id, d)}
                onDuplicate={() => focusNew(draft.duplicateQuestion(q.id))}
                onRemove={() => remove(q.id)}
              />
            ))}

            <button type="button" className={styles.addQuestion} aria-label="Frage hinzufügen" onClick={() => focusNew(draft.addQuestion("single_choice"))}>
              <Icon name="plus" /> Frage
            </button>
            {questions.length > 0 && (
              <div className={styles.finishBar}>
                <span className="muted">Alles drin? Speichern, live schalten und den Link holen.</span>
                <button type="button" className="btn primary big" onClick={finish} disabled={finishing} data-cta>
                  <Icon name="check" size={18} /> Speichern &amp; abschließen
                </button>
              </div>
            )}
          </div>

          <aside className={styles.previewCol} aria-label="Vorschau">
            <div className={styles.previewHead}>
              {tabs}
              {restart}
            </div>
            <div className={styles.phone}>{player}</div>
          </aside>
        </div>

        <button type="button" className={`btn primary ${styles.mobilePreviewBtn}`} onClick={() => setMobilePreview(true)}>
          <Icon name="eye" size={18} /> Vorschau
        </button>
        {mobilePreview && (
          <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Vorschau">
            <div className={styles.overlayBar}>
              {tabs}
              {restart}
              <button type="button" className="icon-btn" onClick={() => setMobilePreview(false)} aria-label="Vorschau schließen"><Icon name="close" /></button>
            </div>
            <div className={styles.overlayBody}>{player}</div>
          </div>
        )}
        {sharing && (
          <ShareDialog
            form={form}
            warnings={formWarnings(questions, playable.length)}
            onStatus={(status) => draft.patchForm({ status }, true)}
            onClose={() => setSharing(false)}
            tafelCount={tafelCount}
          />
        )}
      </main>
    </>
  );
}
