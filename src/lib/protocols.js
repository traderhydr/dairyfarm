// Breeding (heat synchronisation) protocols. A protocol is a record in `protocols`; every step is a task in
// `healthRecords` (the Treatment / Vaccine list) with category "Breeding Protocol" and an exact local time
// (`dueAt`, "YYYY-MM-DDTHH:mm"), so the alerts and phone reminders can work to the hour, not just the day.
// The schedules are the usual textbook timings; the farm's vet decides the drugs, doses and the protocol.
import { dateLocale } from './format.js';

export const BREEDING_CATEGORY = 'Breeding Protocol';
export const PD_STEP = 'pd';
export const FTAI_STEP = 'ftai';

const G1 = 'GnRH (1st injection)';
const G2 = 'GnRH (2nd injection)';

/** offsetH = hours after Day 0. windowFromH/windowToH = the time-critical window around the step. */
export const TEMPLATES = {
  ovsynch: {
    key: 'ovsynch',
    name: 'Ovsynch',
    summary: 'GnRH, then PGF2α 7 days later, GnRH 56 hours after that, and timed AI 18 hours later.',
    steps: [
      { key: 'gnrh1', label: G1, offsetH: 0 },
      { key: 'pgf', label: 'PGF2α', offsetH: 168 },
      { key: 'gnrh2', label: G2, offsetH: 224 },
      { key: FTAI_STEP, label: 'FTAI (timed AI)', offsetH: 242, windowFromH: 240, windowToH: 244 }
    ]
  },
  'cidr-synch': {
    key: 'cidr-synch',
    name: 'CIDR-Synch',
    summary: 'GnRH and CIDR in, then CIDR out with PGF2α 7 days later, GnRH 56 hours after that, and timed AI 18 hours later.',
    steps: [
      { key: 'gnrh1', label: 'GnRH + insert CIDR', offsetH: 0 },
      { key: 'cidr-out', label: 'CIDR removal', offsetH: 168 },
      { key: 'pgf', label: 'PGF2α', offsetH: 168 },
      { key: 'gnrh2', label: G2, offsetH: 224 },
      { key: FTAI_STEP, label: 'FTAI (timed AI)', offsetH: 242, windowFromH: 240, windowToH: 244 }
    ]
  },
  'double-ovsynch': {
    key: 'double-ovsynch',
    name: 'Double-Ovsynch',
    summary: 'A pre-synchronisation Ovsynch, then the breeding Ovsynch 7 days later. Seven steps in all.',
    steps: [
      { key: 'pre-gnrh1', label: 'GnRH (pre-synch 1st injection)', offsetH: 0 },
      { key: 'pre-pgf', label: 'PGF2α (pre-synch)', offsetH: 168 },
      { key: 'pre-gnrh2', label: 'GnRH (pre-synch 2nd injection)', offsetH: 240 },
      { key: 'gnrh1', label: G1, offsetH: 408 },
      { key: 'pgf', label: 'PGF2α', offsetH: 576 },
      { key: 'gnrh2', label: G2, offsetH: 632 },
      { key: FTAI_STEP, label: 'FTAI (timed AI)', offsetH: 650, windowFromH: 648, windowToH: 652 }
    ]
  }
};

export const templateList = () => Object.values(TEMPLATES);

// ---------------------------------------------------------------- local date-times ("YYYY-MM-DDTHH:mm")
const pad = (n) => String(n).padStart(2, '0');

export function formatLocal(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Date for "YYYY-MM-DDTHH:mm" (local time), or null when it is not a real date-time. */
export function parseLocal(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(str || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return Number.isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1 ? null : d;
}

export function addHoursLocal(str, hours) {
  const d = parseLocal(str);
  return d ? formatLocal(new Date(d.getTime() + hours * 3600000)) : null;
}

/** "8:00 AM" */
export function clockText(date) {
  const h = date.getHours();
  return `${h % 12 || 12}:${pad(date.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "14 Nov, 8:00 AM" */
export function dateTimeText(str) {
  const d = parseLocal(str);
  if (!d) return '—';
  return `${d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })}, ${clockText(d)}`;
}

/**
 * When a task is due, in words an assistant on the farm would say. state: 'overdue' | 'now' | 'soon' | 'later'.
 * The English text is translated by the Urdu rules in i18n/patterns.js.
 */
export function describeDue(dueAt, now = new Date()) {
  const due = parseLocal(dueAt);
  if (!due) return { state: 'later', text: '—' };
  const diffMin = Math.round((due - now) / 60000);
  if (diffMin < 0) {
    const m = -diffMin;
    if (m < 60) return { state: 'overdue', text: `overdue by ${m} min` };
    if (m < 48 * 60) return { state: 'overdue', text: `overdue by ${Math.round(m / 60)} h` };
    return { state: 'overdue', text: `overdue by ${Math.floor(m / 1440)} days` };
  }
  if (diffMin === 0) return { state: 'now', text: 'due now' };
  if (diffMin < 60) return { state: 'now', text: `due in ${diffMin} min` };
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOf(due) - startOf(now)) / 86400000);
  const clock = clockText(due);
  if (dayDiff === 0) return { state: 'soon', text: `due today at ${clock}` };
  if (dayDiff === 1) return { state: 'soon', text: `due tomorrow at ${clock}` };
  return { state: 'later', text: `due ${due.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })} at ${clock}` };
}

// ---------------------------------------------------------------- schedules
/** Every step of a template with its exact due time, from Day 0 (a "YYYY-MM-DDTHH:mm" string). */
export function buildSchedule(templateKey, day0) {
  const template = TEMPLATES[templateKey];
  if (!template || !parseLocal(day0)) return [];
  return template.steps.map((step, index) => ({
    index,
    total: template.steps.length,
    key: step.key,
    label: step.label,
    offsetH: step.offsetH,
    dueAt: addHoursLocal(day0, step.offsetH),
    windowStart: step.windowFromH === undefined ? undefined : addHoursLocal(day0, step.windowFromH),
    windowEnd: step.windowToH === undefined ? undefined : addHoursLocal(day0, step.windowToH)
  }));
}

/** The pregnancy check is due 32 days after AI (08:00), and acceptable from day 30 to day 35. */
export function pdSchedule(aiAt) {
  const base = String(aiAt || '').slice(0, 10);
  const at = (days) => {
    const d = parseLocal(`${base}T08:00`);
    return d ? formatLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 8, 0)) : null;
  };
  return { dueAt: at(32), windowStart: at(30), windowEnd: at(35) };
}

export const isProtocolTask = (rec) => Boolean(rec) && rec.category === BREEDING_CATEGORY;
