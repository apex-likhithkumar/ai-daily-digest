import type { Theme } from '../hooks/usePrefs';
import { timeAgo } from '../lib/time';

const NEXT_THEME: Record<Theme, Theme> = { system: 'dark', dark: 'light', light: 'system' };
const THEME_ICON: Record<Theme, string> = { system: '◐', dark: '☾', light: '☀' };

interface Props {
  generatedAt: string | null;
  now: Date;
  theme: Theme;
  onTheme: (theme: Theme) => void;
}

export function Header({ generatedAt, now, theme, onTheme }: Props) {
  return (
    <header className="header">
      <div>
        <h1 className="header__title">AI Daily Digest</h1>
        <p className="header__sub">
          {generatedAt ? `Updated ${timeAgo(generatedAt, now)}` : 'Loading…'}
        </p>
      </div>
      <button
        className="theme-btn"
        onClick={() => onTheme(NEXT_THEME[theme])}
        aria-label={`Theme: ${theme}. Click to change.`}
        title={`Theme: ${theme}`}
      >
        {THEME_ICON[theme]}
      </button>
    </header>
  );
}
