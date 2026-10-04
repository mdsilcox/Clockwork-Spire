// Natural numbers and dates for the Workshop and the save slots.

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "just now", "2 hours ago", "yesterday", "3 Oct" (with the year when it is another year). */
export function when(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'never';
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const hours = Math.floor(mins / 60);
  if (sameDay || hours < 6) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.getFullYear() === yest.getFullYear() && d.getMonth() === yest.getMonth() && d.getDate() === yest.getDate()) return 'yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`}`;
}
