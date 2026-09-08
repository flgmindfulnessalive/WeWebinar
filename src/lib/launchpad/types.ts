// Tipos compartidos del Launchpad -- dominio puro, sin dependencias de
// Next.js/React/Supabase (mismo criterio que readiness/types.ts y
// script-builder/types.ts).

export const LAUNCHPAD_STEP_KEYS = [
  "cost",
  "diagnosis",
  "architecture",
  "script",
  "implementation",
  "demo",
  "create",
] as const;
export type LaunchpadStepKey = (typeof LAUNCHPAD_STEP_KEYS)[number];

export const LAUNCHPAD_STEP_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "needs_review",
] as const;
export type LaunchpadStepStatus = (typeof LAUNCHPAD_STEP_STATUSES)[number];

export type LaunchpadStepProgress = {
  stepKey: LaunchpadStepKey;
  status: LaunchpadStepStatus;
  progressPercentage: number; // 0-100, granularidad dentro de un paso (ver progress.ts)
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
};

export type LaunchpadProject = {
  id: string;
  accountId: string;
  title: string;
  currentStep: LaunchpadStepKey;
  status: "active" | "completed";
  readinessAssessmentId: string | null;
  webinarProjectId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export const LAUNCHPAD_REWARD_TYPES = ["playbook", "discount"] as const;
export type LaunchpadRewardType = (typeof LAUNCHPAD_REWARD_TYPES)[number];

export const LAUNCHPAD_REWARD_STATUSES = ["locked", "unlocked", "redeemed", "expired"] as const;
export type LaunchpadRewardStatus = (typeof LAUNCHPAD_REWARD_STATUSES)[number];
