"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { buildScriptBuilderSignupUrl } from "@/lib/script-builder/config";
import { computeProfileCompletion, missingCriticalFields } from "@/lib/script-builder/completion";
import { STAGE_KEYS, type StageKey } from "@/lib/script-builder/profile-config";
import { buildEvergreenMasterPrompt } from "@/lib/script-builder/prompt-builder";
import {
  clearScriptBuilderState,
  createInitialState,
  loadScriptBuilderState,
  saveScriptBuilderState,
  type ScriptBuilderLocalState,
} from "@/lib/script-builder/storage";
import { trackScriptBuilderEvent } from "@/lib/script-builder/track";
import type { AttributionParams, WebinarProjectProfile } from "@/lib/script-builder/types";
import { LeadCaptureGate, type LeadFormValues } from "./lead-capture-gate";
import { ProjectReview } from "./project-review";
import { PromptResult } from "./prompt-result";
import { RestartProjectDialog } from "./restart-project-dialog";
import { ScriptBuilderLanding } from "./script-builder-landing";
import { StageForm } from "./stage-form";

const LANDING_STEP = 0;
const STAGE_START = 1;
const REVIEW_STEP = STAGE_START + STAGE_KEYS.length; // 8
const LEAD_GATE_STEP = REVIEW_STEP + 1; // 9
const RESULT_STEP = LEAD_GATE_STEP + 1; // 10

type AssessmentPrefill = {
  leadName?: string;
  leadEmail?: string;
  businessType?: string;
};

// Mismo criterio que ReadinessApp/ReadinessFlow (ver readiness-app.tsx):
// localStorage solo existe en el cliente, así que este componente se
// limita a esperar el efecto de carga inicial y delega todo el estado
// interactivo a ScriptBuilderFlow, que recibe el estado ya resuelto como
// prop no-nullable -- evita depender de un narrowing de TypeScript sobre
// un valor nullable capturado por closures anidadas.
type Bootstrap =
  | { status: "loading" }
  | { status: "ready"; initialState: ScriptBuilderLocalState; awaitingResume: boolean };

export function ScriptBuilderApp({
  attribution,
  assessmentId,
}: {
  attribution: AttributionParams;
  assessmentId?: string;
}) {
  const [bootstrap, setBootstrap] = useState<Bootstrap>({ status: "loading" });

  useEffect(() => {
    const saved = loadScriptBuilderState();
    if (saved && !saved.completed && saved.currentStageIndex > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync inicial con localStorage, solo disponible post-mount (ver justificación en readiness-app.tsx)
      setBootstrap({ status: "ready", initialState: saved, awaitingResume: true });
      trackScriptBuilderEvent(saved.projectId, "script_builder_viewed");
    } else {
      // Genera el id acá (no dentro de createInitialState) para poder
      // reusarlo también en el tracking de abajo -- evita mandar
      // projectId "unknown" (un string que ScriptBuilderEventSchema
      // rechaza por no ser UUID, perdiendo el evento en cada primera
      // visita).
      const projectId = crypto.randomUUID();
      setBootstrap({
        status: "ready",
        initialState: createInitialState(projectId, attribution, assessmentId ? { assessmentId } : undefined),
        awaitingResume: false,
      });
      trackScriptBuilderEvent(projectId, "script_builder_viewed");
    }
    // Solo al montar -- attribution/assessmentId vienen de searchParams del
    // server component padre y son estables durante la vida de la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bootstrap.status === "loading") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return <ScriptBuilderFlow initialState={bootstrap.initialState} initialAwaitingResume={bootstrap.awaitingResume} />;
}

function ScriptBuilderFlow({
  initialState,
  initialAwaitingResume,
}: {
  initialState: ScriptBuilderLocalState;
  initialAwaitingResume: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [awaitingResumeChoice, setAwaitingResumeChoice] = useState(initialAwaitingResume);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState<"rate_limited" | "generic" | null>(null);
  const [assessmentPrefill, setAssessmentPrefill] = useState<AssessmentPrefill | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Scroll al inicio al cambiar de etapa" -- mismo pedido del brief que
  // en Readiness (ver readiness-app.tsx).
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [state.currentStageIndex, awaitingResumeChoice]);

  // Escenario A del brief: si el proyecto trae un assessmentId (por
  // localStorage o por ?assessment_id= en la URL), precarga businessType
  // y los datos del lead sin volver a preguntarlos -- nunca pisa un
  // businessType que el usuario ya haya editado a mano.
  useEffect(() => {
    if (!state.assessmentId || assessmentPrefill) return;
    let cancelled = false;
    fetch(`/api/script-builder/assessment/${state.assessmentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { leadName?: string; leadEmail?: string; businessType?: string } | null) => {
        if (!data || cancelled) return;
        setAssessmentPrefill({ leadName: data.leadName, leadEmail: data.leadEmail, businessType: data.businessType });
        if (!state.profile.businessType && data.businessType) {
          persist({ ...state, profile: { ...state.profile, businessType: data.businessType } });
        }
      })
      .catch(() => {
        // best-effort -- si falla, el wizard sigue funcionando sin prefill.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.assessmentId]);

  // Autoguardado debounced del perfil -- nunca incluye el lead (eso se
  // manda una sola vez, explícitamente, desde handleLeadSubmit) para no
  // repetir el sync a Brevo en cada tecla.
  useEffect(() => {
    if (state.currentStageIndex === LANDING_STEP || awaitingResumeChoice) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      fetch("/api/script-builder/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: state.projectId,
          assessmentId: state.assessmentId,
          profile: state.profile,
          attribution: state.attribution,
        }),
      })
        .then((res) => {
          if (res.ok) trackScriptBuilderEvent(state.projectId, "script_builder_progress_saved");
        })
        .catch(() => {
          // Best-effort -- el progreso sigue disponible en localStorage
          // aunque el autoguardado en el servidor falle.
        });
    }, 1200);
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.profile, state.attribution, state.assessmentId, state.currentStageIndex]);

  function persist(next: ScriptBuilderLocalState) {
    setState(next);
    saveScriptBuilderState(next);
  }

  function freshState(): ScriptBuilderLocalState {
    return createInitialState(crypto.randomUUID(), state.attribution);
  }

  function handleStart() {
    const next = freshState();
    persist({ ...next, currentStageIndex: STAGE_START });
    trackScriptBuilderEvent(next.projectId, "script_builder_started");
    trackScriptBuilderEvent(next.projectId, "script_builder_step_started", { stage: STAGE_KEYS[0] });
  }

  function handleResume() {
    setAwaitingResumeChoice(false);
    trackScriptBuilderEvent(state.projectId, "script_builder_resumed");
  }

  function handleRestart() {
    clearScriptBuilderState();
    trackScriptBuilderEvent(state.projectId, "script_project_restarted");
    setAwaitingResumeChoice(false);
    setAssessmentPrefill(null);
    setRestartDialogOpen(false);
    persist(freshState());
  }

  function handleFieldChange<K extends keyof WebinarProjectProfile>(key: K, value: WebinarProjectProfile[K]) {
    persist({ ...state, profile: { ...state.profile, [key]: value } });
  }

  function handleStageContinue(stage: StageKey) {
    const stageIndex = STAGE_KEYS.indexOf(stage);
    trackScriptBuilderEvent(state.projectId, "script_builder_step_completed", { stage });
    if (stageIndex === STAGE_KEYS.length - 1) {
      persist({ ...state, currentStageIndex: REVIEW_STEP });
      trackScriptBuilderEvent(state.projectId, "script_builder_review_viewed");
      return;
    }
    const nextStage = STAGE_KEYS[stageIndex + 1];
    persist({ ...state, currentStageIndex: STAGE_START + stageIndex + 1 });
    trackScriptBuilderEvent(state.projectId, "script_builder_step_started", { stage: nextStage });
  }

  function handleStageBack(stage: StageKey) {
    const stageIndex = STAGE_KEYS.indexOf(stage);
    persist({ ...state, currentStageIndex: stageIndex === 0 ? LANDING_STEP : STAGE_START + stageIndex - 1 });
  }

  function handleEditStage(stage: StageKey) {
    trackScriptBuilderEvent(state.projectId, "script_answers_edited", { from: "review" });
    persist({ ...state, currentStageIndex: STAGE_START + STAGE_KEYS.indexOf(stage) });
  }

  function handleEditAnswersFromResult() {
    trackScriptBuilderEvent(state.projectId, "script_answers_edited", { from: "result" });
    persist({ ...state, currentStageIndex: REVIEW_STEP });
  }

  function handleGenerateFromReview() {
    if (state.completed) {
      // Ya dio su lead antes -- una edición + regeneración no vuelve a
      // pedir consentimiento, pero sí cuenta como una generación nueva
      // (el perfil cambió, script_prompt_generations gana una versión).
      persist({ ...state, currentStageIndex: RESULT_STEP });
      trackScriptBuilderEvent(state.projectId, "script_prompt_generated");
      return;
    }
    persist({ ...state, currentStageIndex: LEAD_GATE_STEP });
    trackScriptBuilderEvent(state.projectId, "script_builder_lead_form_viewed");
  }

  async function handleLeadSubmit(lead: LeadFormValues, honeypot: string) {
    setLeadSubmitting(true);
    setLeadSubmitError(null);
    try {
      const response = await fetch("/api/script-builder/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: state.projectId,
          assessmentId: state.assessmentId,
          profile: state.profile,
          attribution: state.attribution,
          lead: { name: lead.name, email: lead.email, consentGiven: true, marketingConsent: lead.marketingConsent },
          website: honeypot,
        }),
      });

      if (response.status === 429) {
        setLeadSubmitError("rate_limited");
        return;
      }
      if (!response.ok) {
        setLeadSubmitError("generic");
        return;
      }

      persist({ ...state, currentStageIndex: RESULT_STEP, completed: true });
      trackScriptBuilderEvent(state.projectId, "script_builder_lead_submitted");
      trackScriptBuilderEvent(state.projectId, "script_prompt_generated");
    } catch {
      setLeadSubmitError("generic");
    } finally {
      setLeadSubmitting(false);
    }
  }

  function handleCtaClick() {
    trackScriptBuilderEvent(state.projectId, "script_wewebinars_cta_clicked");
  }

  const profileCompletion = useMemo(() => computeProfileCompletion(state.profile), [state.profile]);
  const missingCritical = useMemo(() => missingCriticalFields(state.profile), [state.profile]);
  const prompt = useMemo(() => buildEvergreenMasterPrompt(state.profile), [state.profile]);
  const signupUrl = useMemo(
    () =>
      buildScriptBuilderSignupUrl({
        projectId: state.projectId,
        profileCompletion,
        assessmentId: state.assessmentId,
        attribution: state.attribution,
      }),
    [state.projectId, profileCompletion, state.assessmentId, state.attribution]
  );

  if (awaitingResumeChoice) {
    return (
      <ScriptBuilderLanding hasResumableProgress onStart={handleStart} onResume={handleResume} onRestart={handleRestart} />
    );
  }

  if (state.currentStageIndex === RESULT_STEP) {
    return (
      <>
        <PromptResult
          projectId={state.projectId}
          prompt={prompt}
          signupUrl={signupUrl}
          onCtaClick={handleCtaClick}
          onEditAnswers={handleEditAnswersFromResult}
          onRestart={() => setRestartDialogOpen(true)}
        />
        <RestartProjectDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen} onConfirm={handleRestart} />
      </>
    );
  }

  if (state.currentStageIndex === LEAD_GATE_STEP) {
    return (
      <LeadCaptureGate
        prefillName={assessmentPrefill?.leadName}
        prefillEmail={assessmentPrefill?.leadEmail}
        onSubmit={handleLeadSubmit}
        submitting={leadSubmitting}
        error={leadSubmitError}
      />
    );
  }

  if (state.currentStageIndex === REVIEW_STEP) {
    return (
      <ProjectReview
        profileCompletion={profileCompletion}
        missingCritical={missingCritical}
        onEditStage={handleEditStage}
        onGenerate={handleGenerateFromReview}
      />
    );
  }

  if (state.currentStageIndex >= STAGE_START && state.currentStageIndex < REVIEW_STEP) {
    const stage = STAGE_KEYS[state.currentStageIndex - STAGE_START];
    return (
      <StageForm
        stage={stage}
        profile={state.profile}
        onFieldChange={handleFieldChange}
        onContinue={() => handleStageContinue(stage)}
        onBack={() => handleStageBack(stage)}
      />
    );
  }

  return (
    <ScriptBuilderLanding
      hasResumableProgress={false}
      onStart={handleStart}
      onResume={handleResume}
      onRestart={handleRestart}
    />
  );
}

