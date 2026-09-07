import type { z } from "zod";

import {
  AIProviderError,
  type AIProvider,
  type GenerateStructuredObjectInput,
  type GenerateStructuredObjectResult,
  type GenerateTextInput,
  type GenerateTextResult,
} from "@/lib/ai/provider";

// No network, no API key -- for unit tests and any local dev without
// ANTHROPIC_API_KEY set. Queue canned responses with `mockText`/
// `mockObject`, or leave the queue empty to get an `AIProviderError`
// (the default matters: a test that forgets to stub a response should
// fail loudly, not silently return an empty object).
export class MockAIProvider implements AIProvider {
  private textQueue: string[] = [];
  private objectQueue: unknown[] = [];

  mockText(text: string): void {
    this.textQueue.push(text);
  }

  mockObject(object: unknown): void {
    this.objectQueue.push(object);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the AIProvider signature
  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const text = this.textQueue.shift();
    if (text === undefined) {
      throw new AIProviderError("MockAIProvider: no queued text response", "invalid_response");
    }
    return { text, inputTokens: 0, outputTokens: 0 };
  }

  async generateStructuredObject<Schema extends z.ZodType>({
    schema,
  }: GenerateStructuredObjectInput<Schema>): Promise<GenerateStructuredObjectResult<Schema>> {
    const queued = this.objectQueue.shift();
    if (queued === undefined) {
      throw new AIProviderError("MockAIProvider: no queued object response", "invalid_response");
    }

    const parsed = schema.safeParse(queued);
    if (!parsed.success) {
      throw new AIProviderError(
        `MockAIProvider: queued object did not match schema: ${parsed.error.message}`,
        "invalid_response",
        parsed.error
      );
    }

    return { object: parsed.data, inputTokens: 0, outputTokens: 0 };
  }
}
