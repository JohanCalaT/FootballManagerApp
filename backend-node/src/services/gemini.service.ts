import axios, { AxiosError } from 'axios';
import { GeminiUnavailableError } from '../errors/domain.errors';

/**
 * Cliente HTTP para Google Gemini. Mantiene paridad con el GeminiService
 * de .NET — mismo endpoint, mismo body, misma extracción.
 *
 * Cualquier fallo (timeout, 5xx, JSON malformado, sin candidates) se canaliza
 * a `GeminiUnavailableError` para que el error middleware devuelva 503.
 */
export const generateIdealTeam = async (prompt: string): Promise<string> => {
  const apiKey  = process.env.GEMINI_API_KEY;
  const model   = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const timeout = Number(process.env.GEMINI_TIMEOUT_MS ?? 30_000);

  if (!apiKey) {
    throw new GeminiUnavailableError(
      'GEMINI_API_KEY missing — set via Aspire parameter or .env');
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
    `:generateContent?key=${apiKey}`;

  let data: unknown;
  try {
    const resp = await axios.post(url, {
      contents:         [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }, { timeout });
    data = resp.data;
  } catch (err) {
    const ax = err as AxiosError;
    const detail = ax.code ?? ax.response?.status ?? 'unknown';
    throw new GeminiUnavailableError(`Gemini error: ${detail}`);
  }

  const text = extractText(data);
  if (typeof text !== 'string' || text.length === 0) {
    throw new GeminiUnavailableError('Empty or malformed Gemini response');
  }
  return text;
};

const extractText = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null) return undefined;
  const candidates = (data as { candidates?: unknown[] }).candidates;
  const first = candidates?.[0] as
    { content?: { parts?: Array<{ text?: unknown }> } } | undefined;
  const t = first?.content?.parts?.[0]?.text;
  return typeof t === 'string' ? t : undefined;
};
