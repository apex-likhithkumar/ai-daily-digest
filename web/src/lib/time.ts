const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export function hoursSince(iso: string, now: Date): number {
  return (now.getTime() - Date.parse(iso)) / MS_PER_HOUR;
}

export function timeAgo(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / MS_PER_MINUTE);
  if (minutes < 1) return 'just now';
  if (minutes < MINUTES_PER_HOUR) return `${minutes}m ago`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${hours}h ago`;
  return `${Math.floor(hours / HOURS_PER_DAY)}d ago`;
}
