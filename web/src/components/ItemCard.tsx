import { TOPIC_NAMES } from '../lib/topics';
import { timeAgo } from '../lib/time';
import { safeHttpUrl } from '../lib/url';
import type { FeedItem } from '../types';

interface Props {
  item: FeedItem;
  now: Date;
  read: boolean;
  onRead: (id: string) => void;
  /** The first story of the Top view: bigger headline, more room. */
  lead?: boolean;
}

const SIGNAL_BARS = 5;
const MAX_IMPORTANCE = 10;

function sourcesLabel(sources: string[]): string {
  const [first, ...rest] = sources;
  return rest.length === 0 ? (first ?? '') : `${first} +${rest.length}`;
}

/** Importance 0-10 as a 5-bar meter: the score finally has a shape, with a text equivalent for screen readers. */
function SignalMeter({ importance }: { importance: number }) {
  const filled = Math.max(0, Math.min(SIGNAL_BARS, Math.ceil(importance / (MAX_IMPORTANCE / SIGNAL_BARS))));
  return (
    <span className="signal" role="img" aria-label={`Importance ${Math.round(importance)} of ${MAX_IMPORTANCE}`}>
      {Array.from({ length: SIGNAL_BARS }, (_, i) => (
        <i key={i} className={i < filled ? 'on' : undefined} />
      ))}
    </span>
  );
}

export function ItemCard({ item, now, read, onRead, lead = false }: Props) {
  // The feed is untrusted input: only http(s) links become clickable (blocks javascript: and data: URLs).
  const href = safeHttpUrl(item.url);
  const breaking = item.labels.includes('breaking');
  const classes = ['card', read && 'card--read', breaking && 'card--breaking', lead && 'card--lead']
    .filter(Boolean)
    .join(' ');
  return (
    <article className={classes}>
      <div className="card__meta">
        <span className={`badge badge--${item.topic}`}>{TOPIC_NAMES[item.topic]}</span>
        {breaking && <span className="badge badge--breaking">Breaking</span>}
        <span className="card__source">{sourcesLabel(item.sources)}</span>
        <SignalMeter importance={item.importance} />
        <span className="card__time">{timeAgo(item.publishedAt, now)}</span>
      </div>
      <h2 className="card__title">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => onRead(item.id)}>
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h2>
      {item.whyItMatters && <p className="card__why">{item.whyItMatters}</p>}
    </article>
  );
}
