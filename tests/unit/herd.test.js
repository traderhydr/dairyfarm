import { describe, expect, it } from 'vitest';
import { speciesOfRecord, speciesOfTag } from '../../src/lib/animals.js';
import { pregnancyProgress } from '../../src/lib/dates.js';
import { herdCounts } from '../../src/lib/herd.js';
import { dryOffDay, gestationDays, normalizeSpecies } from '../../src/lib/species.js';
import { buildReminders } from '../../src/lib/reminders.js';

describe('species', () => {
  it('a buffalo carries about 310 days, a cow 283; anything else counts as a cow', () => {
    expect(gestationDays('Cow')).toBe(283);
    expect(gestationDays('Buffalo')).toBe(310);
    expect(gestationDays(undefined)).toBe(283);
    expect(dryOffDay('Cow')).toBe(223);
    expect(dryOffDay('Buffalo')).toBe(250);
    expect(normalizeSpecies('<b>x</b>')).toBe('Cow');
  });
  it('pregnancy progress follows the species', () => {
    const now = new Date(2026, 10, 12, 10, 0);
    expect(pregnancyProgress('2026-08-15', now)).toMatchObject({ day: 89, left: 194 });
    expect(pregnancyProgress('2026-08-15', now, 310)).toMatchObject({ day: 89, left: 221 });
  });
  it('finds the species of a record: saved value, then the herd, then Cow', () => {
    const state = { milkersList: [{ tag: 'Buffalo #02 (Kali)', species: 'Buffalo' }], wachiList: [{ tag: 'Wachi #05 (Moti)', species: 'Buffalo' }, { tag: 'Wachi #06' }] };
    expect(speciesOfTag(state, 'Buffalo #02')).toBe('Buffalo');
    expect(speciesOfTag(state, 'Wachi #05 (Moti)')).toBe('Buffalo');
    expect(speciesOfTag(state, 'Wachi #06')).toBe('Cow');
    expect(speciesOfTag(state, 'Nobody')).toBeNull();
    expect(speciesOfRecord(state, { cowTag: 'Buffalo #02 (Kali)' })).toBe('Buffalo');
    expect(speciesOfRecord(state, { cowTag: 'Buffalo #02 (Kali)', species: 'Cow' })).toBe('Cow');
    expect(speciesOfRecord(state, { cowTag: 'Nobody' })).toBe('Cow');
  });
});

describe('herd counts', () => {
  const state = () => ({
    milkersList: [{ species: 'Cow' }, { species: 'Cow' }, { species: 'Buffalo' }, {}],            // old records have no species: cows
    wachiList: [{ species: 'Buffalo' }, { species: 'Cow' }, {}],
    goats: [{ species: 'Goat', count: 1, status: 'Milking' }, { species: 'Sheep', count: 12 }, { species: 'Goat', count: 4, status: 'Sold' }, { species: 'Goat', count: 2, status: 'Died' }],
    horses: [{ status: 'Active' }, { status: 'Sold' }]
  });
  it('counts cows, buffaloes, heifers, goats and sheep, horses and the total', () => {
    expect(herdCounts(state())).toMatchObject({ cows: 3, buffaloes: 1, heifers: 3, goats: 1, sheep: 12, horses: 1, milking: 4, heifersBuffalo: 1, heifersCow: 2, total: 3 + 1 + 3 + 13 + 1 });
  });
  it('is all zeros for a new farm', () => {
    expect(herdCounts({})).toMatchObject({ cows: 0, buffaloes: 0, heifers: 0, total: 0 });
  });
});

describe('buffalo dates in reminders', () => {
  const now = new Date(2026, 1, 1, 12, 0);
  it('dry-off and calving come later for a buffalo than for a cow', () => {
    const rec = (tag) => ({ id: tag, cowTag: tag, aiDate: '2026-01-10', pregStatus: 'Confirmed Pregnant' });
    const state = { milkersList: [{ tag: 'Buffalo #1', species: 'Buffalo' }, { tag: 'Cow #1', species: 'Cow' }], breedingRecords: [rec('Buffalo #1'), rec('Cow #1')] };
    const days = (title, tag) => buildReminders(state, now).filter((r) => r.title === title && r.body.startsWith(tag)).map((r) => Math.round((r.at - new Date(2026, 0, 10, 8)) / 86400000));
    expect(days('Dry-off due', 'Cow #1')).toEqual([223]);
    expect(days('Dry-off due', 'Buffalo #1')).toEqual([250]);
    expect(days('Calving expected today', 'Cow #1')).toEqual([283]);
    expect(days('Calving expected today', 'Buffalo #1')).toEqual([310]);
    expect(days('Calving in 7 days', 'Buffalo #1')).toEqual([303]);
  });
});
