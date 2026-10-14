// Works out Open / Closed / Opens Soon from the stored business hours.
// Cambodia is UTC+7 all year (no daylight saving), so we calculate in that zone.
const OFFSET_MIN = 7 * 60;
const SOON_MINUTES = 60;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMin = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + m;
};

export function fmtTime(s) {
  const [h, m] = String(s).split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function cambodiaNow(date = new Date()) {
  const t = new Date(date.getTime() + OFFSET_MIN * 60000);
  return { day: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/**
 * @returns {{state:'open'|'closed'|'opens_soon'|'unknown', label:string, detail:string}}
 */
export function getOpenStatus(hours, date = new Date()) {
  if (!Array.isArray(hours) || hours.length === 0) {
    return { state: 'unknown', label: 'Hours not listed', detail: '' };
  }
  const { day, minutes } = cambodiaNow(date);
  const byDay = (d) => hours.find((h) => h.day === d);

  const today = byDay(day);
  if (today && !today.isClosed) {
    const o = toMin(today.open);
    const c = toMin(today.close);
    if (o === c) return { state: 'open', label: 'Open', detail: 'Open 24 hours' };
    if (o < c && minutes >= o && minutes < c) return { state: 'open', label: 'Open', detail: `Closes at ${fmtTime(today.close)}` };
    if (o > c && minutes >= o) return { state: 'open', label: 'Open', detail: `Closes at ${fmtTime(today.close)}` };
  }
  // Opened yesterday and still going past midnight?
  const yesterday = byDay((day + 6) % 7);
  if (yesterday && !yesterday.isClosed) {
    const o = toMin(yesterday.open);
    const c = toMin(yesterday.close);
    if (o > c && minutes < c) return { state: 'open', label: 'Open', detail: `Closes at ${fmtTime(yesterday.close)}` };
  }

  // Closed right now: find the next opening time within a week.
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7;
    const h = byDay(d);
    if (!h || h.isClosed) continue;
    const until = i * 1440 + toMin(h.open) - minutes;
    if (until <= 0) continue;
    if (until <= SOON_MINUTES) {
      return { state: 'opens_soon', label: 'Opens Soon', detail: `Opens at ${fmtTime(h.open)}` };
    }
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[d];
    return { state: 'closed', label: 'Closed', detail: `Opens ${when} at ${fmtTime(h.open)}` };
  }
  return { state: 'closed', label: 'Closed', detail: '' };
}

export function defaultHours(open = '08:00', close = '20:00') {
  return Array.from({ length: 7 }, (_, day) => ({ day, isClosed: false, open, close }));
}
