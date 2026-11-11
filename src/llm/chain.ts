import type { LlmClient } from './types';

/** Try providers in order; the first success wins. */
export class ChainLlmClient implements LlmClient {
  constructor(private readonly clients: LlmClient[]) {}

  async complete(prompt: string): Promise<string> {
    let lastError: unknown = new Error('No LLM providers configured');
    for (const client of this.clients) {
      try {
        return await client.complete(prompt);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}
