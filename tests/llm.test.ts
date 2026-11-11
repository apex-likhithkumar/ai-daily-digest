import { describe, expect, it } from 'vitest';
import { ChainLlmClient } from '../src/llm/chain';
import { GeminiClient } from '../src/llm/gemini';
import { GroqClient } from '../src/llm/groq';
import { buildLlm } from '../src/llm';
import type { FetchLike } from '../src/http';
import type { LlmClient } from '../src/llm/types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('GeminiClient', () => {
  it('posts the prompt with the key in a header and returns the reply text', async () => {
    let seen: { url: string; headers: Record<string, string>; body: string } | undefined;
    const fetchImpl: FetchLike = async (input, init) => {
      seen = { url: String(input), headers: init?.headers as Record<string, string>, body: String(init?.body) };
      return jsonResponse({ candidates: [{ content: { parts: [{ text: '{"results":[]}' }] } }] });
    };
    const text = await new GeminiClient('KEY', 'gemini-test', fetchImpl).complete('hello');
    expect(text).toBe('{"results":[]}');
    expect(seen?.url).toContain('/models/gemini-test:generateContent');
    expect(seen?.url).not.toContain('KEY'); // key never in the URL
    expect(seen?.headers['x-goog-api-key']).toBe('KEY');
    expect(seen?.body).toContain('hello');
  });

  it('throws with the status on a non-OK response and never echoes the key', async () => {
    const fetchImpl: FetchLike = async () => jsonResponse({ error: 'quota' }, 429);
    await expect(new GeminiClient('KEY', 'm', fetchImpl).complete('x')).rejects.toThrow('Gemini 429');
  });

  it('throws when the reply has no text', async () => {
    const fetchImpl: FetchLike = async () => jsonResponse({ candidates: [] });
    await expect(new GeminiClient('KEY', 'm', fetchImpl).complete('x')).rejects.toThrow('no text');
  });
});

describe('GroqClient', () => {
  it('posts an OpenAI-style chat request and returns the message content', async () => {
    let seen: { headers: Record<string, string>; body: string } | undefined;
    const fetchImpl: FetchLike = async (_input, init) => {
      seen = { headers: init?.headers as Record<string, string>, body: String(init?.body) };
      return jsonResponse({ choices: [{ message: { content: '{"results":[]}' } }] });
    };
    const text = await new GroqClient('KEY', 'llama-test', fetchImpl).complete('hello');
    expect(text).toBe('{"results":[]}');
    expect(seen?.headers.Authorization).toBe('Bearer KEY');
    expect(seen?.body).toContain('llama-test');
    expect(seen?.body).toContain('json_object');
  });

  it('throws with the status on a non-OK response', async () => {
    const fetchImpl: FetchLike = async () => jsonResponse({}, 500);
    await expect(new GroqClient('KEY', 'm', fetchImpl).complete('x')).rejects.toThrow('Groq 500');
  });
});

describe('ChainLlmClient', () => {
  const failing: LlmClient = { async complete() { throw new Error('first down'); } };
  const working: LlmClient = { async complete() { return 'ok'; } };

  it('falls through to the next provider', async () => {
    expect(await new ChainLlmClient([failing, working]).complete('x')).toBe('ok');
  });

  it('throws the last error when every provider fails', async () => {
    await expect(new ChainLlmClient([failing, failing]).complete('x')).rejects.toThrow('first down');
  });

  it('throws a clear error when no provider is configured', async () => {
    await expect(new ChainLlmClient([]).complete('x')).rejects.toThrow('No LLM providers');
  });
});

describe('buildLlm', () => {
  it('skips providers whose API key is missing', async () => {
    const llm = buildLlm([{ type: 'gemini', model: 'm' }, { type: 'groq', model: 'm' }], {});
    await expect(llm.complete('x')).rejects.toThrow('No LLM providers');
  });
});
