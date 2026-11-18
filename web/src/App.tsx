import { useEffect, useMemo, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { Header } from './components/Header';
import { ItemCard } from './components/ItemCard';
import { READ_CAP, usePrefs } from './hooks/usePrefs';
import { useFeed } from './hooks/useFeed';
import { filterItems, viewCounts, type View } from './lib/filter';
import { hoursSince } from './lib/time';

// GitHub delays scheduled workflows under load: real gaps between runs were 6-10h, so a 6h threshold showed the banner constantly.
const STALE_AFTER_HOURS = 12;
const EMPTY_FEED_ITEMS: never[] = [];
const SKELETON_CARDS = 4;

export default function App() {
  const { feed, error } = useFeed();
  const [prefs, update] = usePrefs();
  const [view, setView] = useState<View>('top');
  const now = new Date();

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  const items = feed?.items ?? EMPTY_FEED_ITEMS;
  const visible = useMemo(
    () => filterItems(items, { view, topics: prefs.topics, muted: prefs.muted }),
    [items, view, prefs.topics, prefs.muted],
  );
  const counts = useMemo(() => viewCounts(items, prefs.topics, prefs.muted), [items, prefs.topics, prefs.muted]);
  const readSet = useMemo(() => new Set(prefs.read), [prefs.read]);

  const stale = feed !== null && hoursSince(feed.generatedAt, now) > STALE_AFTER_HOURS;
  const loading = feed === null && error === null;

  function markRead(id: string) {
    if (!readSet.has(id)) update({ read: [id, ...prefs.read].slice(0, READ_CAP) });
  }

  return (
    <div className="app">
      <Header generatedAt={feed?.generatedAt ?? null} now={now} theme={prefs.theme} onTheme={(theme) => update({ theme })} />
      <div className="layout">
        <aside className="rail">
          <FilterBar
            view={view}
            counts={counts}
            topics={prefs.topics}
            muted={prefs.muted}
            onView={setView}
            onTopics={(topics) => update({ topics })}
            onMuted={(muted) => update({ muted })}
          />
        </aside>
        <div className="content">
          {stale && <p className="notice">This digest is more than {STALE_AFTER_HOURS} hours old. The next update may be delayed.</p>}
          {error && <p className="notice notice--error">Could not load the digest ({error}).</p>}
          <main className="list" aria-busy={loading}>
            {loading &&
              Array.from({ length: SKELETON_CARDS }, (_, i) => (
                <div key={i} className="card card--skeleton" aria-hidden="true">
                  <span className="skeleton-line" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line" />
                </div>
              ))}
            {visible.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                now={now}
                read={readSet.has(item.id)}
                onRead={markRead}
                lead={view === 'top' && index === 0}
              />
            ))}
            {feed && visible.length === 0 && (
              <p className="empty">
                {view === 'breaking' && prefs.topics.length === 0 && prefs.muted.length === 0
                  ? 'Nothing is breaking right now. Today shows everything from the last 24 hours.'
                  : 'Nothing matches these filters. Clear a topic or unmute a word to see more.'}
              </p>
            )}
          </main>
          <footer className="foot">
            Your topic filters, muted words and read marks stay in this browser. The feed refreshes every few hours.
          </footer>
        </div>
      </div>
    </div>
  );
}
