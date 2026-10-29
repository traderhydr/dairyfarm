// Works out which farm events deserve a phone notification. Pure: no device APIs here.
import { addDaysDate } from './dates.js';

const REMINDER_HOUR = 8;
const MAX_REMINDERS = 60; // Android caps scheduled alarms; the nearest ones matter most

/** Stable positive 31-bit id for a reminder key (Android notification ids are ints). */
export function hashId(key) {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function at(dateStr, offsetDays) {
  const d = addDaysDate(dateStr, offsetDays);
  if (d) d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d;
}

/**
 * @param {object} state  the farm snapshot (breedingRecords, healthRecords, ...)
 * @param {Date} now
 * @returns {{id:number, at:Date, title:string, body:string}[]} upcoming reminders, soonest first
 */
export function buildReminders(state, now = new Date()) {
  const out = [];
  const add = (key, when, title, body) => {
    if (when && when.getTime() > now.getTime()) out.push({ id: hashId(key), at: when, title, body });
  };

  for (const r of state.breedingRecords || []) {
    if (!r.aiDate) continue;
    if (r.pregStatus === 'Awaiting PD Check') {
      add(`${r.id}:heat`, at(r.aiDate, 21), 'Heat check due', `${r.cowTag}: 21 days since AI - watch for repeat heat.`);
      add(`${r.id}:pd`, at(r.aiDate, 60), 'Pregnancy (PD) check due', `${r.cowTag}: 60 days since AI - book the PD check.`);
    } else if (r.pregStatus === 'Confirmed Pregnant') {
      add(`${r.id}:dry`, at(r.aiDate, 223), 'Dry-off due', `${r.cowTag}: time to dry off before calving.`);
      add(`${r.id}:calf7`, at(r.aiDate, 276), 'Calving in 7 days', `${r.cowTag} is due to calve in a week. Prepare the calving pen.`);
      add(`${r.id}:calf`, at(r.aiDate, 283), 'Calving expected today', `${r.cowTag} is due to calve today.`);
    }
  }

  for (const h of state.healthRecords || []) {
    if (h.status === 'Booster Completed' || !h.dateGiven) continue;
    const interval = Number(h.intervalDays) || 90;
    add(`${h.id}:soon`, at(h.dateGiven, interval - 3), `${h.type} due in 3 days`, `${h.target}: next dose is coming up.`);
    add(`${h.id}:due`, at(h.dateGiven, interval), `${h.type} due today`, `${h.target}: give the next dose today.`);
  }

  return out.sort((a, b) => a.at - b.at).slice(0, MAX_REMINDERS);
}
