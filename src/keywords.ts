function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary match so "AI" does not match "said" and "crypto" does not match "cryptography". */
export function matchesKeyword(text: string, keyword: string): boolean {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(keyword)}(?![a-z0-9])`, 'i');
  return pattern.test(text);
}

export function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => matchesKeyword(text, keyword));
}

export function countMatches(text: string, keywords: string[]): number {
  return keywords.filter((keyword) => matchesKeyword(text, keyword)).length;
}
