import "server-only";

import type { AIProvider } from "@/lib/ai/provider";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";

export type { AIProvider, AIEffort } from "@/lib/ai/provider";
export { AIProviderError } from "@/lib/ai/provider";

let provider: AIProvider | null = null;

// Single entry point for the generation pipeline -- swap the
// implementation here (or inject a mock in tests) without touching call
// sites.
export function getAIProvider(): AIProvider {
  if (!provider) provider = new AnthropicProvider();
  return provider;
}
