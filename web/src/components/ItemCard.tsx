import { TOPIC_NAMES } from '../lib/topics';
import { timeAgo } from '../lib/time';
import type { FeedItem } from '../types';

interface Props {
  item: FeedItem;
  now: Date;
  read: boolean;
  onRead: (id: string) => void;
}

function sourcesLabel(sources: string[]): string {
  const [first, ...rest] = sources;
  return rest.length === 0 ? (first ?? '') : `${first} +${rest.length}`;
}

export function ItemCard({ item, now, read, onRead }: Props) {
  return (
    <article className={`card${read ? ' card--read' : ''}`}>
      <div className="card__meta">
        <span className={`badge badge--${item.topic}`}>{TOPIC_NAMES[item.topic]}</span>
        {item.labels.includes('breaking') && <span className="badge badge--breaking">Breaking</span>}
        <span className="card__source">{sourcesLabel(item.sources)}</span>
        <span className="card__time">{timeAgo(item.publishedAt, now)}</span>
      </div>
      <h2 className="card__title">
        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onRead(item.id)}>
          {item.title}
        </a>
      </h2>
      {item.whyItMatters && <p className="card__why">{item.whyItMatters}</p>}
    </article>
  );
}
