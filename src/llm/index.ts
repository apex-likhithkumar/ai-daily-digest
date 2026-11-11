import type { Rules } from '../config';
import type { FetchLike } from '../http';
import { ChainLlmClient } from './chain';
import { GeminiClient } from './gemini';
import { GroqClient } from './groq';
import type { LlmClient } from './types';

export function buildLlm(
  providers: Rules['llm']['providers'],
  keys: { gemini?: string; groq?: string },
  fetchImpl: FetchLike = fetch,
): LlmClient {
  const clients: LlmClient[] = [];
  for (const provider of providers) {
    if (provider.type === 'gemini' && keys.gemini) clients.push(new GeminiClient(keys.gemini, provider.model, fetchImpl));
    if (provider.type === 'groq' && keys.groq) clients.push(new GroqClient(keys.groq, provider.model, fetchImpl));
  }
  return new ChainLlmClient(clients);
}
