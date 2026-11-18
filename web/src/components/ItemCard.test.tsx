import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FeedItem } from '../types';
import { ItemCard } from './ItemCard';

const NOW = new Date('2026-11-09T12:00:00.000Z');
const item: FeedItem = {
  id: 'i1', title: 'OpenAI releases GPT-5', url: 'https://openai.com/news/gpt-5',
  sources: ['OpenAI', 'Hacker News', 'r/LocalLLaMA'], bestTier: 1, publishedAt: '2026-11-09T09:00:00.000Z',
  summary: '', topic: 'B', importance: 9, relevance: 8, whyItMatters: 'Longer context changes your RAG design.',
  scoredBy: 'llm', firstSeenAt: '2026-11-09T09:30:00.000Z', labels: ['breaking', 'today'], rank: 8,
};

describe('ItemCard', () => {
  it('shows the title link, the one-liner, source count, age and breaking badge', () => {
    render(<ItemCard item={item} now={NOW} read={false} onRead={() => {}} />);
    const link = screen.getByRole('link', { name: 'OpenAI releases GPT-5' });
    expect(link).toHaveAttribute('href', 'https://openai.com/news/gpt-5');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Longer context changes your RAG design.')).toBeInTheDocument();
    expect(screen.getByText('Breaking')).toBeInTheDocument();
    expect(screen.getByText('OpenAI +2')).toBeInTheDocument();
    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('omits the one-liner for fallback-scored items and marks read items', () => {
    const { container } = render(
      <ItemCard item={{ ...item, whyItMatters: '', scoredBy: 'fallback', labels: [] }} now={NOW} read onRead={() => {}} />,
    );
    expect(container.querySelector('.card__why')).toBeNull();
    expect(container.querySelector('.card--read')).not.toBeNull();
  });

  it('reports the id when the link is clicked', () => {
    const onRead = vi.fn();
    render(<ItemCard item={item} now={NOW} read={false} onRead={onRead} />);
    fireEvent.click(screen.getByRole('link'));
    expect(onRead).toHaveBeenCalledWith('i1');
  });

  // Added after security review: a non-http(s) URL in the feed must never become a clickable href.
  it('renders the title as plain text, with no link, when the url is not http(s)', () => {
    render(<ItemCard item={{ ...item, url: 'javascript:alert(1)' }} now={NOW} read={false} onRead={() => {}} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('OpenAI releases GPT-5')).toBeInTheDocument();
  });

  // Redesign: importance is shown as a 5-bar signal meter with an accessible text equivalent.
  it('shows importance as a signal meter, 5 bars for 10/10 and 3 for 5/10', () => {
    const { container, rerender } = render(<ItemCard item={{ ...item, importance: 10 }} now={NOW} read={false} onRead={() => {}} />);
    expect(screen.getByRole('img', { name: 'Importance 10 of 10' })).toBeInTheDocument();
    expect(container.querySelectorAll('.signal i.on')).toHaveLength(5);
    rerender(<ItemCard item={{ ...item, importance: 5 }} now={NOW} read={false} onRead={() => {}} />);
    expect(container.querySelectorAll('.signal i.on')).toHaveLength(3);
  });

  it('marks breaking items and the lead story with their own card classes', () => {
    const { container, rerender } = render(<ItemCard item={item} now={NOW} read={false} onRead={() => {}} lead />);
    expect(container.querySelector('.card--breaking')).not.toBeNull();
    expect(container.querySelector('.card--lead')).not.toBeNull();
    rerender(<ItemCard item={{ ...item, labels: ['today'] }} now={NOW} read={false} onRead={() => {}} />);
    expect(container.querySelector('.card--breaking')).toBeNull();
    expect(container.querySelector('.card--lead')).toBeNull();
  });
});
