import type { FetchLike } from '../http';
import { LLM_TEMPERATURE, LLM_TIMEOUT_MS, type LlmClient } from './types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async complete(prompt: string): Promise<string> {
    const response = await this.fetchImpl(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: LLM_TEMPERATURE,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Groq ${response.status}`);
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq returned no text');
    return text;
  }
}
