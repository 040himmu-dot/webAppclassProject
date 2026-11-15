const { AppError } = require('../config/errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

function requireText(value, label, max = 255) {
  const v = str(value);
  if (!v) throw new AppError(400, `${label} is required.`);
  if (v.length > max) throw new AppError(400, `${label} must be at most ${max} characters.`);
  return v;
}
function requireEmail(value) {
  const v = requireText(value, 'Email', 150).toLowerCase();
  if (!EMAIL_RE.test(v)) throw new AppError(400, 'Please enter a valid email address.');
  return v;
}
function requirePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new AppError(400, `${label} must be a whole number of 1 or more.`);
  return n;
}
function requireNonNegInt(value, label) {
  const n = Number(value);
  if (value === '' || value == null || !Number.isInteger(n) || n < 0) {
    throw new AppError(400, `${label} must be a whole number of 0 or more.`);
  }
  return n;
}
function requirePassword(value) {
  const v = typeof value === 'string' ? value : '';
  if (v.length < 6) throw new AppError(400, 'Password must be at least 6 characters.');
  return v;
}
function requireDate(value, label) {
  const v = str(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const d = m && new Date(+m[1], +m[2] - 1, +m[3]);
  if (!m || d.getMonth() !== +m[2] - 1) throw new AppError(400, `${label} must be a valid date (YYYY-MM-DD).`);
  return v;
}
function optionalDate(value, label) {
  return str(value) ? requireDate(value, label) : null;
}
/** "2026-11-10T14:30" (browser) or "2026-11-10 14:30:00" -> "2026-11-10 14:30:00" */
function requireDateTime(value, label) {
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(str(value));
  if (!m) throw new AppError(400, `${label} must be a valid date and time.`);
  requireDate(m[1], label);
  if (+m[2] > 23 || +m[3] > 59) throw new AppError(400, `${label} must be a valid date and time.`);
  return `${m[1]} ${m[2]}:${m[3]}:${m[4] || '00'}`;
}

// ---- Volunteer availability, e.g. "Mon-Fri 09:00-17:00, Sat 10:00-14:00" or "Daily 08:00-20:00"
const mins = (h, m) => Number(h) * 60 + Number(m);
function parseAvailability(text) {
  const out = [];
  for (const tok of str(text).split(/[,;]/).map((t) => t.trim()).filter(Boolean)) {
    const m = /^([A-Za-z]+)(?:\s*-\s*([A-Za-z]+))?\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(tok);
    if (!m) throw new AppError(400, `Availability "${tok}" is not in the format "Mon-Fri 09:00-17:00".`);
    const a = m[1].toLowerCase().slice(0, 3);
    let days;
    if (['dai', 'any', 'all', 'eve'].includes(a)) days = [0, 1, 2, 3, 4, 5, 6];
    else {
      const from = DAYS.indexOf(a);
      const to = m[2] ? DAYS.indexOf(m[2].toLowerCase().slice(0, 3)) : from;
      if (from < 0 || to < 0) throw new AppError(400, `Unknown day name in availability "${tok}".`);
      days = [];
      for (let d = from; ; d = (d + 1) % 7) { days.push(d); if (d === to) break; }
    }
    const start = mins(m[3], m[4]);
    const end = mins(m[5], m[6]);
    if (start >= end || end > 24 * 60) throw new AppError(400, `Availability "${tok}" has an invalid time range.`);
    out.push({ days, start, end });
  }
  return out;
}
function normalizeAvailability(text) {
  const t = str(text);
  if (t) parseAvailability(t); // throws if invalid
  return t || null;
}
/** Does the availability text fully cover a shift (start/end as SQL datetimes on the same day)? */
function availabilityCovers(text, startSql, endSql) {
  const [sd, st] = startSql.split(' ');
  const [ed, et] = endSql.split(' ');
  if (sd !== ed) return false;
  const [y, mo, d] = sd.split('-').map(Number);
  const dow = new Date(y, mo - 1, d).getDay();
  const [sh, sm] = st.split(':');
  const [eh, em] = et.split(':');
  const s = mins(sh, sm);
  const e = mins(eh, em);
  return parseAvailability(text).some((w) => w.days.includes(dow) && s >= w.start && e <= w.end);
}

module.exports = {
  str, requireText, requireEmail, requirePositiveInt, requireNonNegInt, requirePassword,
  requireDate, optionalDate, requireDateTime, normalizeAvailability, availabilityCovers,
};
