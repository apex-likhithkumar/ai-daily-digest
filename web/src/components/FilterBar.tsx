import { useState, type FormEvent } from 'react';
import { VIEWS, type View } from '../lib/filter';
import { TOPIC_NAMES, TOPIC_ORDER } from '../lib/topics';
import type { Topic } from '../types';

const VIEW_NAMES: Record<View, string> = {
  top: 'Top',
  breaking: 'Breaking',
  today: 'Today',
  important: 'Important',
  all: 'All',
};

interface Props {
  view: View;
  counts: Record<View, number>;
  topics: Topic[];
  muted: string[];
  onView: (view: View) => void;
  onTopics: (topics: Topic[]) => void;
  onMuted: (muted: string[]) => void;
}

export function FilterBar({ view, counts, topics, muted, onView, onTopics, onMuted }: Props) {
  const [draft, setDraft] = useState('');

  function toggleTopic(topic: Topic) {
    onTopics(topics.includes(topic) ? topics.filter((t) => t !== topic) : [...topics, topic]);
  }

  function addMuted(event: FormEvent) {
    event.preventDefault();
    const word = draft.trim().toLowerCase();
    if (word && !muted.includes(word)) onMuted([...muted, word]);
    setDraft('');
  }

  return (
    <div className="filters">
      <div className="chips" role="tablist" aria-label="View">
        {VIEWS.map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className={`chip chip--view${view === v ? ' chip--active' : ''}${v === 'breaking' ? ' chip--breaking' : ''}`}
            onClick={() => onView(v)}
          >
            {VIEW_NAMES[v]} <span className="chip__count">{counts[v]}</span>
          </button>
        ))}
      </div>
      <div className="chips" aria-label="Topics">
        {TOPIC_ORDER.map((t) => (
          <button
            key={t}
            aria-pressed={topics.includes(t)}
            className={`chip chip--topic chip--${t}${topics.includes(t) ? ' chip--active' : ''}`}
            onClick={() => toggleTopic(t)}
          >
            {TOPIC_NAMES[t]}
          </button>
        ))}
      </div>
      <form className="mute" onSubmit={addMuted}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mute a keyword…"
          aria-label="Mute a keyword"
        />
        {muted.map((word) => (
          <button
            type="button"
            key={word}
            className="chip chip--muted"
            onClick={() => onMuted(muted.filter((m) => m !== word))}
            aria-label={`Unmute ${word}`}
          >
            {word} ×
          </button>
        ))}
      </form>
    </div>
  );
}
