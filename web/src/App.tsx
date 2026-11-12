import { useEffect, useMemo, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { Header } from './components/Header';
import { ItemCard } from './components/ItemCard';
import { READ_CAP, usePrefs } from './hooks/usePrefs';
import { useFeed } from './hooks/useFeed';
import { filterItems, viewCounts, type View } from './lib/filter';
import { hoursSince } from './lib/time';

const STALE_AFTER_HOURS = 6;
const EMPTY_FEED_ITEMS: never[] = [];

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

  function markRead(id: string) {
    if (!readSet.has(id)) update({ read: [id, ...prefs.read].slice(0, READ_CAP) });
  }

  return (
    <div className="app">
      <Header generatedAt={feed?.generatedAt ?? null} now={now} theme={prefs.theme} onTheme={(theme) => update({ theme })} />
      <FilterBar
        view={view}
        counts={counts}
        topics={prefs.topics}
        muted={prefs.muted}
        onView={setView}
        onTopics={(topics) => update({ topics })}
        onMuted={(muted) => update({ muted })}
      />
      {stale && <p className="notice">This digest is more than {STALE_AFTER_HOURS} hours old. The next update may be delayed.</p>}
      {error && <p className="notice notice--error">Could not load the digest ({error}).</p>}
      <main className="list">
        {visible.map((item) => (
          <ItemCard key={item.id} item={item} now={now} read={readSet.has(item.id)} onRead={markRead} />
        ))}
        {feed && visible.length === 0 && <p className="empty">Nothing here for these filters.</p>}
      </main>
    </div>
  );
}
