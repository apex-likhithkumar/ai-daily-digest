export type FetchLike = typeof fetch;

export const FETCH_TIMEOUT_MS = 15_000;
export const USER_AGENT = 'ai-daily-digest/1.0 (personal news digest)';

export async function httpGetText(
  url: string,
  fetchImpl: FetchLike = fetch,
  headers: Record<string, string> = {},
): Promise<string> {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT, ...headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return response.text();
}
