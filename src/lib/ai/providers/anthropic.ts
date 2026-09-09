import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import {
  AIProviderError,
  type AIProvider,
  type GenerateStructuredObjectInput,
  type GenerateStructuredObjectResult,
  type GenerateTextInput,
  type GenerateTextResult,
} from "@/lib/ai/provider";

// Same model string already hardcoded in the 3 pre-existing AI routes
// (e.g. api/support/ai-reply) -- one place to change it if that ever
// changes, instead of three (soon more, once the generation pipeline
// lands).
export const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

function mapError(err: unknown): AIProviderError {
  if (err instanceof Anthropic.RateLimitError) {
    return new AIProviderError("Rate limited by Anthropic API", "rate_limited", err);
  }
  if (err instanceof Anthropic.APIError) {
    return new AIProviderError(`Anthropic API request failed: ${err.message}`, "request_failed", err);
  }
  return new AIProviderError("Anthropic request failed", "request_failed", err);
}

export class AnthropicProvider implements AIProvider {
  async generateText({ system, prompt, maxTokens, effort }: GenerateTextInput): Promise<GenerateTextResult> {
    let response;
    try {
      response = await getClient().messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        output_config: effort ? { effort } : undefined,
        system,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err) {
      throw mapError(err);
    }

    if (response.stop_reason === "refusal") {
      throw new AIProviderError("Model refused the request", "refused");
    }

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") {
        text = block.text;
        break;
      }
    }

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  async generateStructuredObject<Schema extends z.ZodType>({
    system,
    prompt,
    schema,
    maxTokens,
    effort,
  }: GenerateStructuredObjectInput<Schema>): Promise<GenerateStructuredObjectResult<Schema>> {
    let response;
    try {
      response = await getClient().messages.parse({
        model: MODEL,
        max_tokens: maxTokens,
        output_config: {
          format: zodOutputFormat(schema),
          ...(effort ? { effort } : {}),
        },
        system,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err) {
      throw mapError(err);
    }

    if (response.stop_reason === "refusal") {
      throw new AIProviderError("Model refused the request", "refused");
    }
    if (response.stop_reason === "max_tokens") {
      throw new AIProviderError("Response truncated at max_tokens", "invalid_response");
    }
    if (response.parsed_output === null) {
      throw new AIProviderError("Response did not match the expected schema", "invalid_response");
    }

    return {
      object: response.parsed_output,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
