import { describe, expect, it, vi } from 'vitest';
import { buildReminders, hashId } from '../../src/lib/reminders.js';
import { createReminderScheduler } from '../../src/native/reminders.js';

const now = new Date(2026, 9, 29, 12, 0); // 29 Oct 2026, noon
const day = (y, m, d) => new Date(y, m - 1, d, 8, 0).getTime();

describe('buildReminders', () => {
  it('schedules heat and PD checks for cows awaiting PD', () => {
    const r = buildReminders({ breedingRecords: [{ id: 'c1', cowTag: 'Rani', aiDate: '2026-10-27', pregStatus: 'Awaiting PD Check' }] }, now);
    expect(r.map((x) => [x.title, x.at.getTime()])).toEqual([
      ['Heat check due', day(2026, 11, 17)],
      ['Pregnancy (PD) check due', day(2026, 12, 26)]
    ]);
    expect(r[0].body).toContain('Rani');
  });

  it('schedules dry-off and calving reminders for pregnant cows, skipping past ones', () => {
    const r = buildReminders({ breedingRecords: [{ id: 'c2', cowTag: 'Chandi', aiDate: '2026-08-15', pregStatus: 'Confirmed Pregnant' }] }, now);
    expect(r.map((x) => x.title)).toEqual(['Dry-off due', 'Calving in 7 days', 'Calving expected today']);
    expect(r[2].at.getTime()).toBe(day(2027, 5, 25));
  });

  it('ignores calved or not-pregnant cows and cows without an AI date', () => {
    const r = buildReminders({ breedingRecords: [
      { id: 'a', cowTag: 'A', aiDate: '2026-10-27', pregStatus: 'Calved' },
      { id: 'b', cowTag: 'B', aiDate: '2026-10-27', pregStatus: 'Repeat / Not Pregnant' },
      { id: 'c', cowTag: 'C', pregStatus: 'Awaiting PD Check' }
    ] }, now);
    expect(r).toEqual([]);
  });

  it('reminds 3 days before and on the day a health booster is due', () => {
    const r = buildReminders({ healthRecords: [{ id: 'h1', type: 'FMD Vaccine', target: 'Herd', dateGiven: '2026-09-15', intervalDays: 180, status: 'Scheduled Booster' }] }, now);
    expect(r.map((x) => x.at.getTime())).toEqual([day(2027, 3, 11), day(2027, 3, 14)]);
  });

  it('skips completed boosters and past dates', () => {
    const r = buildReminders({ healthRecords: [
      { id: 'h2', type: 'X', target: 'T', dateGiven: '2026-01-01', intervalDays: 30, status: 'Scheduled Booster' },
      { id: 'h3', type: 'Y', target: 'T', dateGiven: '2026-10-20', intervalDays: 90, status: 'Booster Completed' }
    ] }, now);
    expect(r).toEqual([]);
  });

  it('does not schedule a reminder whose time has already passed today', () => {
    const r = buildReminders({ breedingRecords: [{ id: 'd', cowTag: 'D', aiDate: '2026-10-08', pregStatus: 'Awaiting PD Check' }] }, now); // heat check = today 08:00
    expect(r.find((x) => x.title === 'Heat check due')).toBeUndefined();
  });

  it('returns soonest first and caps the list', () => {
    const breedingRecords = Array.from({ length: 50 }, (_, i) => ({ id: `c${i}`, cowTag: `C${i}`, aiDate: '2026-10-28', pregStatus: 'Awaiting PD Check' }));
    const r = buildReminders({ breedingRecords }, now);
    expect(r).toHaveLength(60);
    expect(r.every((x, i) => i === 0 || r[i - 1].at <= x.at)).toBe(true);
  });

  it('gives stable positive integer ids', () => {
    expect(hashId('c1:heat')).toBe(hashId('c1:heat'));
    expect(hashId('c1:heat')).not.toBe(hashId('c1:pd'));
    expect(Number.isInteger(hashId('x')) && hashId('x') > 0).toBe(true);
  });
});

describe('reminder scheduler', () => {
  const fakePlugin = (display = 'granted', pending = []) => ({
    checkPermissions: vi.fn(async () => ({ display })),
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    getPending: vi.fn(async () => ({ notifications: pending })),
    cancel: vi.fn(async () => {}),
    schedule: vi.fn(async () => {})
  });
  const state = { breedingRecords: [{ id: 'c1', cowTag: 'Rani', aiDate: '2026-10-27', pregStatus: 'Awaiting PD Check' }] };

  it('cancels what was scheduled before and schedules the current reminders', async () => {
    const plugin = fakePlugin('granted', [{ id: 99 }]);
    const count = await createReminderScheduler(plugin, () => state, () => now).reschedule();
    expect(count).toBe(2);
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 99 }] });
    const sent = plugin.schedule.mock.calls[0][0].notifications;
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ title: 'Heat check due', smallIcon: 'ic_stat_cow', schedule: { allowWhileIdle: true } });
  });

  it('does not call schedule when nothing is due', async () => {
    const plugin = fakePlugin();
    expect(await createReminderScheduler(plugin, () => ({}), () => now).reschedule()).toBe(0);
    expect(plugin.schedule).not.toHaveBeenCalled();
  });

  it('only prompts for permission when not already granted', async () => {
    const granted = fakePlugin('granted');
    expect(await createReminderScheduler(granted, () => state).requestPermission()).toBe(true);
    expect(granted.requestPermissions).not.toHaveBeenCalled();
    const prompt = fakePlugin('prompt');
    expect(await createReminderScheduler(prompt, () => state).requestPermission()).toBe(true);
    expect(prompt.requestPermissions).toHaveBeenCalled();
  });

  it('disable cancels everything pending', async () => {
    const plugin = fakePlugin('granted', [{ id: 1 }, { id: 2 }]);
    await createReminderScheduler(plugin, () => state).disable();
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }, { id: 2 }] });
  });
});
