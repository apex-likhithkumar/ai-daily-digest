import type { FetchLike } from '../http';
import { LLM_TEMPERATURE, LLM_TIMEOUT_MS, type LlmClient } from './types';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async complete(prompt: string): Promise<string> {
    const response = await this.fetchImpl(`${GEMINI_BASE_URL}/${this.model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: LLM_TEMPERATURE },
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Gemini ${response.status}`);
    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no text');
    return text;
  }
}
