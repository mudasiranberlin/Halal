export function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Show Monday first
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function fmtTime(s) {
  if (!s) return '';
  const [h, m] = s.split(':').map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export const defaultHours = () => Array.from({ length: 7 }, (_, day) => ({ day, isClosed: false, open: '08:00', close: '20:00' }));

/** Phnom Penh weekday (0 = Sunday), so "today" is right even if the visitor's device is elsewhere. */
export const cambodiaWeekday = () => new Date(Date.now() + 7 * 3600 * 1000).getUTCDay();

export const phoneHref = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '');
export const telegramHref = (t) => {
  const v = String(t || '').trim();
  if (!v) return '';
  return /^\+?\d[\d\s-]+$/.test(v) ? `https://t.me/+${v.replace(/\D/g, '')}` : `https://t.me/${v.replace(/^@/, '')}`;
};

export const STATUS_LABEL = { pending: 'Pending approval', approved: 'Approved', rejected: 'Rejected', active: 'Active', disabled: 'Disabled', inactive: 'Inactive' };
