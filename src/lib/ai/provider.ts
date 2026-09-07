import type { z } from "zod";

// Decoupled from any specific LLM vendor -- every call WeWe Studio's
// generation pipeline makes goes through this interface, never through
// @anthropic-ai/sdk directly (unlike the 3 pre-existing routes that call
// Anthropic inline). getAIProvider() below picks the real implementation;
// tests use the mock instead of hitting the network.

export type AIEffort = "low" | "medium" | "high";

export type GenerateTextInput = {
  system?: string;
  prompt: string;
  maxTokens: number;
  effort?: AIEffort;
};

export type GenerateTextResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

export type GenerateStructuredObjectInput<Schema extends z.ZodType> = {
  system?: string;
  prompt: string;
  schema: Schema;
  maxTokens: number;
  effort?: AIEffort;
};

export type GenerateStructuredObjectResult<Schema extends z.ZodType> = {
  object: z.infer<Schema>;
  inputTokens: number;
  outputTokens: number;
};

// Thrown for every failure mode (upstream request failure, refusal,
// max_tokens truncation, schema validation failure) so callers can branch
// on `.kind` without importing vendor-specific error classes.
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: "request_failed" | "rate_limited" | "refused" | "invalid_response",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructuredObject<Schema extends z.ZodType>(
    input: GenerateStructuredObjectInput<Schema>
  ): Promise<GenerateStructuredObjectResult<Schema>>;
}
