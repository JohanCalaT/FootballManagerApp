import { GoogleGenAI } from "@google/genai";
import { ReviewSchema, type Review } from "./schema.ts";

export const MODEL_CHAIN = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
] as const;

export interface GeminiResult {
  review: Review | null;
  modelUsed: string | null;
  errors: string[];
}

export async function reviewWithFallback(prompt: string): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { review: null, modelUsed: null, errors: ["GEMINI_API_KEY missing"] };
  }
  const ai = new GoogleGenAI({ apiKey });
  const errors: string[] = [];

  for (const model of MODEL_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      const text = response.text;
      if (!text) {
        errors.push(`${model}: empty response`);
        continue;
      }
      const json = JSON.parse(stripFences(text));
      const parsed = ReviewSchema.parse(json);
      return { review: parsed, modelUsed: model, errors };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${msg}`);
    }
  }
  return { review: null, modelUsed: null, errors };
}

function stripFences(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
  }
  return trimmed;
}
