import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AIProviderError } from "@/lib/ai/provider";
import { MockAIProvider } from "@/lib/ai/providers/mock";

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
});

describe("MockAIProvider", () => {
  it("returns queued text in FIFO order", async () => {
    const provider = new MockAIProvider();
    provider.mockText("first");
    provider.mockText("second");

    await expect(provider.generateText({ prompt: "p", maxTokens: 10 })).resolves.toMatchObject({
      text: "first",
    });
    await expect(provider.generateText({ prompt: "p", maxTokens: 10 })).resolves.toMatchObject({
      text: "second",
    });
  });

  it("throws AIProviderError when no text is queued", async () => {
    const provider = new MockAIProvider();
    await expect(provider.generateText({ prompt: "p", maxTokens: 10 })).rejects.toThrow(AIProviderError);
  });

  it("validates queued objects against the given schema", async () => {
    const provider = new MockAIProvider();
    provider.mockObject({ name: "Ada", age: 30 });

    const result = await provider.generateStructuredObject({
      prompt: "p",
      maxTokens: 10,
      schema: PersonSchema,
    });

    expect(result.object).toEqual({ name: "Ada", age: 30 });
  });

  it("throws AIProviderError when a queued object fails schema validation", async () => {
    const provider = new MockAIProvider();
    provider.mockObject({ name: "Ada" }); // missing `age`

    await expect(
      provider.generateStructuredObject({ prompt: "p", maxTokens: 10, schema: PersonSchema })
    ).rejects.toThrow(AIProviderError);
  });
});
