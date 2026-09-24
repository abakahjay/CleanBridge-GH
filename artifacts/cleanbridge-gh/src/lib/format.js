const TZ = 'Africa/Accra';

export const cedi = (amount) => {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '−' : '';
  return `${sign}GH₵ ${Math.abs(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const cediShort = (amount) => {
  const n = Number(amount) || 0;
  return n >= 10000 ? `GH₵ ${(n / 1000).toFixed(1)}k` : cedi(n);
};

export const formatDate = (value, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  value ? new Date(value).toLocaleDateString('en-GB', { timeZone: TZ, ...opts }) : '—';

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const formatTime = (value) =>
  value ? new Date(value).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '—';

export const todayLong = () => new Date().toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// "YYYY-MM-DD" for <input type="date"> in Accra time.
export const isoDay = (date = new Date()) => new Date(date).toLocaleDateString('en-CA', { timeZone: TZ });

export const timeAgo = (value) => {
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const greeting = () => {
  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || '';
export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export const STATUS_LABELS = {
  requested: 'Requested', assigned: 'Collector assigned', on_the_way: 'On the way', completed: 'Completed', cancelled: 'Cancelled',
  planned: 'Planned', in_progress: 'In progress',
  pending: 'Pending', verified: 'Verified', rejected: 'Rejected',
  paid: 'Paid', unpaid: 'Unpaid', refunded: 'Refunded',
  available: 'Available', on_route: 'On route', off_duty: 'Off duty',
  active: 'Active', suspended: 'Suspended'
};

const TONES = {
  completed: 'green', verified: 'green', paid: 'green', available: 'green', active: 'green',
  on_the_way: 'yellow', in_progress: 'yellow', on_route: 'yellow', assigned: 'yellow',
  requested: 'orange', pending: 'orange', planned: 'orange', unpaid: 'orange',
  cancelled: 'slate', rejected: 'red', refunded: 'slate', off_duty: 'slate', suspended: 'red'
};

export const statusLabel = (status) => STATUS_LABELS[status] || status;
export const statusTone = (status) => TONES[status] || 'slate';

export const plural = (n, word, pluralWord = `${word}s`) => `${n} ${n === 1 ? word : pluralWord}`;
