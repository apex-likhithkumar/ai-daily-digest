export interface LlmClient {
  /** Send a prompt, get the model's raw text reply. Throws on any failure. */
  complete(prompt: string): Promise<string>;
}

export const LLM_TIMEOUT_MS = 60_000;
export const LLM_TEMPERATURE = 0.2;
