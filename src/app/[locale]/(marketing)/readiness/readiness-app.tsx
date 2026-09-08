"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { buildSignupUrl } from "@/lib/readiness/config";
import { computeScorePercentage } from "@/lib/readiness/scoring";
import {
  clearReadinessState,
  createInitialState,
  loadReadinessState,
  saveReadinessState,
  type ReadinessLocalState,
} from "@/lib/readiness/storage";
import { trackReadinessEvent } from "@/lib/readiness/track";
import {
  READINESS_CATEGORY_KEYS,
  type AnswerValue,
  type AttributionParams,
  type ContextAnswers,
  type QuestionId,
  type ReadinessReport,
} from "@/lib/readiness/types";
import { LeadCaptureGate, type LeadFormValues } from "./lead-capture-gate";
import { ReadinessCategoryStep } from "./readiness-category-step";
import { ReadinessContextStep } from "./readiness-context-step";
import { ReadinessLanding } from "./readiness-landing";
import { ReadinessResults } from "./readiness-results";

const CONTEXT_STEP = 1;
const FIRST_CATEGORY_STEP = 2;
const LEAD_GATE_STEP = FIRST_CATEGORY_STEP + READINESS_CATEGORY_KEYS.length; // 8
const RESULTS_STEP = LEAD_GATE_STEP + 1; // 9

// localStorage solo existe en el cliente -- leerlo durante el render
// inicial produciría un mismatch de hidratación, así que este componente
// se limita a esperar el efecto de carga y después delega TODO el estado
// interactivo a ReadinessFlow, que recibe el estado inicial ya resuelto
// como prop (nunca null) -- evita depender de un narrowing de TypeScript
// sobre un valor nullable capturado por closures anidadas, que no
// persiste entre funciones anidadas.
type Bootstrap =
  | { status: "loading" }
  | { status: "ready"; initialState: ReadinessLocalState; awaitingResume: boolean };

export function ReadinessApp({ attribution }: { attribution: AttributionParams }) {
  const [bootstrap, setBootstrap] = useState<Bootstrap>({ status: "loading" });

  useEffect(() => {
    const saved = loadReadinessState();
    if (saved && !saved.completed && saved.currentStepIndex > 0) {
      // localStorage no existe durante SSR -- este setState es la
      // sincronización inicial con un store externo solo disponible en el
      // cliente, no el patrón de estado derivado que la regla busca
      // evitar (react.dev/learn/you-might-not-need-an-effect excluye
      // explícitamente el caso de "sync con un sistema externo"). Un
      // useState perezoso leería localStorage también durante la primera
      // pasada de hidratación en el cliente, produciendo HTML distinto al
      // que generó el servidor -- por eso el valor "de verdad" se aplica
      // acá, después de montar, no antes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBootstrap({ status: "ready", initialState: saved, awaitingResume: true });
    } else {
      setBootstrap({
        status: "ready",
        initialState: createInitialState(crypto.randomUUID(), attribution),
        awaitingResume: false,
      });
    }
    // Solo al montar -- attribution es estable durante la vida de la
    // página (viene de searchParams del server component padre).
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

  return (
    <ReadinessFlow
      attribution={attribution}
      initialState={bootstrap.initialState}
      initialAwaitingResume={bootstrap.awaitingResume}
    />
  );
}

function ReadinessFlow({
  attribution,
  initialState,
  initialAwaitingResume,
}: {
  attribution: AttributionParams;
  initialState: ReadinessLocalState;
  initialAwaitingResume: boolean;
}) {
  const [state, setState] = useState(initialState);
  // true mientras esperamos que el usuario elija "continuar" o "empezar de
  // nuevo" en la landing -- evita saltar directo al paso guardado sin que
  // el usuario lo confirme (ver ReadinessLanding.hasResumableProgress).
  const [awaitingResumeChoice, setAwaitingResumeChoice] = useState(initialAwaitingResume);
  const [result, setResult] = useState<ReadinessReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<"rate_limited" | "generic" | null>(null);

  // "Scroll al inicio al cambiar de etapa" (pedido explícito del brief) --
  // sin esto, avanzar de categoría deja al usuario en medio de la
  // categoría anterior en vez de arriba de la nueva.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [state.currentStepIndex, awaitingResumeChoice]);

  function persist(next: ReadinessLocalState) {
    setState(next);
    saveReadinessState(next);
  }

  function freshState(): ReadinessLocalState {
    return createInitialState(crypto.randomUUID(), attribution);
  }

  function handleStart() {
    const next = freshState();
    persist({ ...next, currentStepIndex: CONTEXT_STEP });
    trackReadinessEvent(next.assessmentId, "readiness_started");
  }

  function handleResume() {
    setAwaitingResumeChoice(false);
    trackReadinessEvent(state.assessmentId, "readiness_started", { resumed: true });
  }

  function handleRestartFromLanding() {
    clearReadinessState();
    trackReadinessEvent(state.assessmentId, "readiness_restarted");
    setAwaitingResumeChoice(false);
    persist(freshState());
  }

  function handleContextChange(patch: Partial<ContextAnswers>) {
    persist({ ...state, context: { ...state.context, ...patch } });
  }

  function handleContextContinue() {
    persist({ ...state, currentStepIndex: FIRST_CATEGORY_STEP });
    trackReadinessEvent(state.assessmentId, "readiness_context_completed");
    trackReadinessEvent(state.assessmentId, "readiness_category_started", { category: READINESS_CATEGORY_KEYS[0] });
  }

  function handleAnswer(questionId: QuestionId, value: AnswerValue) {
    persist({ ...state, answers: { ...state.answers, [questionId]: value } });
  }

  function handleCategoryContinue(categoryIndex: number) {
    const category = READINESS_CATEGORY_KEYS[categoryIndex];
    const progressPercentage = Math.round(((categoryIndex + 1) / READINESS_CATEGORY_KEYS.length) * 100);
    trackReadinessEvent(state.assessmentId, "readiness_category_completed", {
      category,
      progress_percentage: progressPercentage,
    });
    trackReadinessEvent(state.assessmentId, "readiness_progress_saved", { progress_percentage: progressPercentage });

    const isLastCategory = categoryIndex === READINESS_CATEGORY_KEYS.length - 1;
    if (isLastCategory) {
      persist({ ...state, currentStepIndex: LEAD_GATE_STEP });
      trackReadinessEvent(state.assessmentId, "readiness_completed");
      return;
    }

    const nextCategory = READINESS_CATEGORY_KEYS[categoryIndex + 1];
    persist({ ...state, currentStepIndex: FIRST_CATEGORY_STEP + categoryIndex + 1 });
    trackReadinessEvent(state.assessmentId, "readiness_category_started", { category: nextCategory });
  }

  function handleCategoryBack(categoryIndex: number) {
    const step = categoryIndex === 0 ? CONTEXT_STEP : FIRST_CATEGORY_STEP + categoryIndex - 1;
    persist({ ...state, currentStepIndex: step });
  }

  async function handleLeadSubmit(lead: LeadFormValues, honeypot: string) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/readiness/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: state.assessmentId,
          startedAt: state.startedAt,
          answers: Object.entries(state.answers).map(([questionId, answer]) => ({ questionId, answer })),
          context: state.context,
          lead: { name: lead.name, email: lead.email, consentGiven: true, marketingConsent: lead.marketingConsent },
          attribution: state.attribution,
          website: honeypot,
        }),
      });

      if (response.status === 429) {
        setSubmitError("rate_limited");
        return;
      }
      if (!response.ok) {
        setSubmitError("generic");
        return;
      }

      const report = (await response.json()) as ReadinessReport;
      trackReadinessEvent(state.assessmentId, "readiness_lead_submitted");
      persist({ ...state, currentStepIndex: RESULTS_STEP, completed: true });
      setResult(report);
      trackReadinessEvent(state.assessmentId, "readiness_result_viewed", {
        total_score: report.scorePercentage,
        readiness_status: report.readinessStatus,
        weakest_category: report.weakestCategory,
      });
    } catch {
      setSubmitError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCtaClick() {
    if (!result) return;
    trackReadinessEvent(result.assessmentId, "readiness_cta_clicked");
  }

  function handleBlueprintClick() {
    if (!result) return;
    trackReadinessEvent(result.assessmentId, "readiness_blueprint_clicked");
  }

  function handleRestartFromResults() {
    trackReadinessEvent(state.assessmentId, "readiness_restarted");
    clearReadinessState();
    setResult(null);
    setSubmitError(null);
    persist(freshState());
  }

  if (awaitingResumeChoice) {
    return (
      <ReadinessLanding
        hasResumableProgress
        onStart={handleStart}
        onResume={handleResume}
        onRestart={handleRestartFromLanding}
      />
    );
  }

  if (state.currentStepIndex === RESULTS_STEP && result) {
    return (
      <ReadinessResults
        report={result}
        signupUrl={buildSignupUrl({
          assessmentId: result.assessmentId,
          scorePercentage: result.scorePercentage,
          weakestCategory: result.weakestCategory,
          attribution: state.attribution,
        })}
        onCtaClick={handleCtaClick}
        onBlueprintClick={handleBlueprintClick}
        onRestart={handleRestartFromResults}
      />
    );
  }

  if (state.currentStepIndex === LEAD_GATE_STEP) {
    return (
      <LeadCaptureGate
        previewPercentage={computeScorePercentage(state.answers)}
        onAnticipationRevealed={() => trackReadinessEvent(state.assessmentId, "readiness_lead_form_viewed")}
        onSubmit={handleLeadSubmit}
        submitting={submitting}
        error={submitError}
      />
    );
  }

  if (state.currentStepIndex >= FIRST_CATEGORY_STEP && state.currentStepIndex < LEAD_GATE_STEP) {
    const categoryIndex = state.currentStepIndex - FIRST_CATEGORY_STEP;
    const category = READINESS_CATEGORY_KEYS[categoryIndex];
    return (
      <ReadinessCategoryStep
        category={category}
        stepNumber={categoryIndex + 1}
        totalSteps={READINESS_CATEGORY_KEYS.length}
        answers={state.answers}
        onAnswer={handleAnswer}
        onContinue={() => handleCategoryContinue(categoryIndex)}
        onBack={() => handleCategoryBack(categoryIndex)}
      />
    );
  }

  if (state.currentStepIndex === CONTEXT_STEP) {
    return (
      <ReadinessContextStep
        value={state.context}
        onChange={handleContextChange}
        onContinue={handleContextContinue}
        onBack={() => persist({ ...state, currentStepIndex: 0 })}
      />
    );
  }

  return (
    <ReadinessLanding
      hasResumableProgress={false}
      onStart={handleStart}
      onResume={handleResume}
      onRestart={handleRestartFromLanding}
    />
  );
}
