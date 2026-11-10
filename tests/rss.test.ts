import { describe, expect, it } from 'vitest';
import { filterInclude, parseFeed } from '../src/collectors/rss';
import type { RssSource } from '../src/config';

const SOURCE: RssSource = { id: 'openai', type: 'rss', name: 'OpenAI', tier: 1, url: 'https://openai.com/rss' };

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
<item><title>OpenAI releases GPT-5</title><link>https://openai.com/news/gpt-5/?utm_source=rss</link><pubDate>Mon, 09 Nov 2026 08:00:00 GMT</pubDate><description>&lt;p&gt;Big &amp;amp; new&lt;/p&gt;</description></item>
<item><title></title><link>https://x.com/a</link><pubDate>Mon, 09 Nov 2026 08:00:00 GMT</pubDate></item>
<item><title>Bad date</title><link>https://x.com/b</link><pubDate>not a date</pubDate></item>
<item><title>Bad link</title><link>javascript:alert(1)</link><pubDate>Mon, 09 Nov 2026 08:00:00 GMT</pubDate></item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Llama 5 weights leaked?</title>
<link href="https://www.reddit.com/r/LocalLLaMA/comments/abc/llama_5/" />
<updated>2026-11-09T07:30:00+00:00</updated><content type="html">&lt;p&gt;discussion&lt;/p&gt;</content></entry></feed>`;

describe('parseFeed', () => {
  it('parses RSS items and drops entries with no title, bad date or unsafe link', () => {
    const items = parseFeed(RSS, SOURCE);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'OpenAI releases GPT-5',
      url: 'https://openai.com/news/gpt-5/?utm_source=rss',
      sourceId: 'openai',
      sourceName: 'OpenAI',
      tier: 1,
      publishedAt: '2026-11-09T08:00:00.000Z',
      summary: 'Big & new',
    });
  });

  it('parses Atom entries (Reddit style)', () => {
    const items = parseFeed(ATOM, { ...SOURCE, name: 'r/LocalLLaMA', tier: 3 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Llama 5 weights leaked?',
      url: 'https://www.reddit.com/r/LocalLLaMA/comments/abc/llama_5/',
      publishedAt: '2026-11-09T07:30:00.000Z',
      summary: 'discussion',
    });
  });

  it('copies the source topicHint onto each item', () => {
    const items = parseFeed(RSS, { ...SOURCE, topicHint: 'E' });
    expect(items[0]?.topicHint).toBe('E');
  });

  it('returns nothing for non-feed XML', () => {
    expect(parseFeed('<html></html>', SOURCE)).toEqual([]);
  });
});

describe('filterInclude', () => {
  const items = parseFeed(RSS, SOURCE);
  it('keeps everything when no include list is set', () => {
    expect(filterInclude(items, undefined)).toHaveLength(1);
  });
  it('keeps only items matching an include keyword', () => {
    expect(filterInclude(items, ['GPT'])).toHaveLength(1);
    expect(filterInclude(items, ['kubernetes'])).toHaveLength(0);
  });
});
