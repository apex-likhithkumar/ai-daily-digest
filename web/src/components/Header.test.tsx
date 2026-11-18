import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Header } from './Header';

const NOW = new Date('2026-11-09T12:00:00.000Z');

describe('Header', () => {
  it('reads as a daily briefing: today\'s date and how fresh the data is', () => {
    render(<Header generatedAt="2026-11-09T09:00:00.000Z" now={NOW} theme="system" onTheme={() => {}} />);
    expect(screen.getByRole('heading', { name: 'AI Daily Digest' })).toBeInTheDocument();
    expect(screen.getByText(/November/)).toBeInTheDocument();
    expect(screen.getByText(/updated 3h ago/)).toBeInTheDocument();
  });

  it('says it is loading until the feed arrives', () => {
    render(<Header generatedAt={null} now={NOW} theme="dark" onTheme={() => {}} />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });
});
