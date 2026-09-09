import {
  FIT_MAX,
  OPPORTUNITY_MAX,
  type CreatorResearchResult,
} from "@/lib/ai/pipeline/analyze-prospect";

export type ScoreComponent = { points: number; max: number; reason: string };
export type ScoreBreakdown = Record<string, ScoreComponent>;
export type ScoreBand = "low" | "medium" | "high" | "excellent";

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "excellent";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function clampComponent(points: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(points)));
}

// The model is prompted with the exact caps (see analyze-prospect.ts) but
// nothing guarantees it stays inside them -- clamp defensively so a score
// can never render or store above its own component's stated maximum.
export function computeFitScore(result: CreatorResearchResult): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {};
  let total = 0;
  for (const [key, max] of Object.entries(FIT_MAX)) {
    const component = result.fitComponents[key as keyof typeof FIT_MAX];
    const points = clampComponent(component.points, max);
    breakdown[key] = { points, max, reason: component.reason };
    total += points;
  }
  return { score: Math.min(100, total), breakdown };
}

export function computeOpportunityScore(
  result: CreatorResearchResult
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {};
  let total = 0;
  for (const [key, max] of Object.entries(OPPORTUNITY_MAX)) {
    const component = result.opportunityComponents[key as keyof typeof OPPORTUNITY_MAX];
    const points = clampComponent(component.points, max);
    breakdown[key] = { points, max, reason: component.reason };
    total += points;
  }
  return { score: Math.min(100, total), breakdown };
}

// The 2x2 priority matrix from ARCHITECTURE.md's Fit/Opportunity Score
// section -- both axes share the same "high" threshold (60) on purpose.
export type PriorityQuadrant = "contact_now" | "strategic" | "low_priority" | "ignore";

export function priorityQuadrant(fitScore: number, opportunityScore: number): PriorityQuadrant {
  const highFit = fitScore >= 60;
  const highOpportunity = opportunityScore >= 60;
  if (highFit && highOpportunity) return "contact_now";
  if (highFit && !highOpportunity) return "strategic";
  if (!highFit && highOpportunity) return "low_priority";
  return "ignore";
}
