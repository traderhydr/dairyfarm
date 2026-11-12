import { describe, expect, it } from 'vitest';
import { cancelProtocol, completeTask, earlyHeat, enrollProtocol, protocolView, skipTask, tasksOf } from '../../src/lib/protocol-actions.js';
import { buildSchedule, describeDue, formatLocal, parseLocal, pdSchedule, TEMPLATES } from '../../src/lib/protocols.js';

const farm = () => ({
  protocols: [], healthRecords: [], breedingRecords: [],
  wachiList: [{ id: 'w1', tag: 'Wachi #01 (Noori)', stage: 'Ready for 1st AI' }],
  milkersList: [{ id: 'm1', tag: 'Cow #07 (Chandi)' }, { id: 'm2', tag: 'Cow #14 (Rani)' }]
});

describe('local date-times', () => {
  it('parses and formats, and rejects things that are not real', () => {
    expect(formatLocal(parseLocal('2026-11-12T08:05'))).toBe('2026-11-12T08:05');
    expect(parseLocal('2026-02-30T08:00')).toBeNull();
    expect(parseLocal('<img>')).toBeNull();
    expect(parseLocal('')).toBeNull();
    expect(parseLocal('2026-11-12')).toBeNull();
  });
});

describe('schedules, to the hour', () => {
  it('Ovsynch is GnRH, +168 h PGF2α, +224 h GnRH, +242 h FTAI', () => {
    const s = buildSchedule('ovsynch', '2026-11-12T08:00');
    expect(s.map((x) => [x.label, x.dueAt])).toEqual([
      ['GnRH (1st injection)', '2026-11-12T08:00'],
      ['PGF2α', '2026-11-19T08:00'],
      ['GnRH (2nd injection)', '2026-11-21T16:00'],
      ['FTAI (timed AI)', '2026-11-22T10:00']
    ]);
    const ftai = s[3];
    expect(ftai.windowStart).toBe('2026-11-22T08:00');   // 16 h after the 2nd GnRH
    expect(ftai.windowEnd).toBe('2026-11-22T12:00');     // 20 h after
  });
  it('keeps the minutes it was given', () => {
    expect(buildSchedule('ovsynch', '2026-11-12T08:30')[3].dueAt).toBe('2026-11-22T10:30');
  });
  it('CIDR-Synch has five steps and Double-Ovsynch seven', () => {
    expect(buildSchedule('cidr-synch', '2026-11-12T08:00').map((x) => x.label)).toEqual([
      'GnRH + insert CIDR', 'CIDR removal', 'PGF2α', 'GnRH (2nd injection)', 'FTAI (timed AI)'
    ]);
    const d = buildSchedule('double-ovsynch', '2026-11-12T08:00');
    expect(d).toHaveLength(7);
    expect(d[6].label).toBe('FTAI (timed AI)');
    expect(d[6].dueAt).toBe('2026-12-09T10:00');         // +650 h
  });
  it('knows every template and returns nothing for bad input', () => {
    expect(Object.keys(TEMPLATES)).toEqual(['ovsynch', 'cidr-synch', 'double-ovsynch']);
    expect(buildSchedule('nope', '2026-11-12T08:00')).toEqual([]);
    expect(buildSchedule('ovsynch', 'garbage')).toEqual([]);
  });
  it('the pregnancy check is due 32 days after AI, with a 30 to 35 day window', () => {
    expect(pdSchedule('2026-11-22T10:00')).toEqual({ dueAt: '2026-12-24T08:00', windowStart: '2026-12-22T08:00', windowEnd: '2026-12-27T08:00' });
  });
});

describe('describeDue', () => {
  const now = new Date(2026, 10, 12, 14, 0);
  const at = (s) => describeDue(s, now);
  it('speaks in minutes, today, tomorrow and dates', () => {
    expect(at('2026-11-12T14:00').text).toBe('due now');
    expect(at('2026-11-12T14:25')).toEqual({ state: 'now', text: 'due in 25 min' });
    expect(at('2026-11-12T20:00')).toEqual({ state: 'soon', text: 'due today at 8:00 PM' });
    expect(at('2026-11-13T08:00')).toEqual({ state: 'soon', text: 'due tomorrow at 8:00 AM' });
    expect(at('2026-11-19T08:00').state).toBe('later');
    expect(at('2026-11-19T08:00').text).toMatch(/^due .+ at 8:00 AM$/);
  });
  it('flags overdue steps by how late they are', () => {
    expect(at('2026-11-12T13:30')).toEqual({ state: 'overdue', text: 'overdue by 30 min' });
    expect(at('2026-11-12T10:00')).toEqual({ state: 'overdue', text: 'overdue by 4 h' });
    expect(at('2026-11-08T14:00')).toEqual({ state: 'overdue', text: 'overdue by 4 days' });
  });
  it('is safe with bad data', () => { expect(at('<b>x</b>').text).toBe('—'); });
});

describe('starting a protocol', () => {
  it('creates a protocol and one timed task per step in the treatment list', () => {
    const s = farm();
    const r = enrollProtocol(s, { tags: ['Cow #07 (Chandi)'], template: 'ovsynch', day0: '2026-11-12T08:00' });
    expect(r.started).toHaveLength(1);
    expect(s.protocols[0]).toMatchObject({ animalTag: 'Cow #07 (Chandi)', templateName: 'Ovsynch', status: 'Active', steps: 4 });
    const tasks = tasksOf(s, s.protocols[0].id);
    expect(tasks.map((t) => t.type)).toEqual(['GnRH (1st injection)', 'PGF2α', 'GnRH (2nd injection)', 'FTAI (timed AI)']);
    expect(tasks[0]).toMatchObject({ category: 'Breeding Protocol', target: 'Cow #07 (Chandi)', dueAt: '2026-11-12T08:00', status: 'Scheduled', dateGiven: '2026-11-12' });
    expect(tasks[3].windowStart).toBe('2026-11-22T08:00');
  });
  it('can start a whole batch, and skips a cow that is already in a protocol', () => {
    const s = farm();
    const r = enrollProtocol(s, { tags: ['Cow #07 (Chandi)', 'Cow #14 (Rani)'], template: 'cidr-synch', day0: '2026-11-12T08:00' });
    expect(r.started).toHaveLength(2);
    expect(s.healthRecords).toHaveLength(10);
    const again = enrollProtocol(s, { tags: ['Cow #07 (Chandi)', 'Wachi #01 (Noori)'], template: 'ovsynch', day0: '2026-11-13T08:00' });
    expect(again.skipped).toEqual(['Cow #07 (Chandi)']);
    expect(again.started.map((p) => p.animalTag)).toEqual(['Wachi #01 (Noori)']);
  });
});

describe('finishing the protocol', () => {
  const started = (template = 'ovsynch') => {
    const s = farm();
    enrollProtocol(s, { tags: ['Wachi #01 (Noori)'], template, day0: '2026-11-12T08:00' });
    return s;
  };
  it('the final AI logs the insemination, starts the PD check and updates her status', () => {
    const s = started();
    const [g1, pgf, g2, ftai] = tasksOf(s, s.protocols[0].id);
    [g1, pgf, g2].forEach((t) => completeTask(s, t.id));
    completeTask(s, ftai.id, { when: '2026-11-22T10:10', sire: 'Holstein Friesian #402' });
    expect(s.protocols[0]).toMatchObject({ status: 'Bred', bredVia: 'FTAI', sire: 'Holstein Friesian #402', aiAt: '2026-11-22T10:10' });
    expect(s.breedingRecords[0]).toMatchObject({ cowTag: 'Wachi #01 (Noori)', aiDate: '2026-11-22', semenBull: 'Holstein Friesian #402', pregStatus: 'Awaiting PD Check', protocolId: s.protocols[0].id });
    expect(s.wachiList[0].stage).toBe('Inseminated (1st AI Done)');
    const pd = tasksOf(s, s.protocols[0].id).find((t) => t.stepKey === 'pd');
    expect(pd).toMatchObject({ type: 'Pregnancy Check (PD)', dueAt: '2026-12-24T08:00', status: 'Scheduled' });
  });
  it('skipped hormone steps are cancelled when the final AI is done', () => {
    const s = started();
    const [, , , ftai] = tasksOf(s, s.protocols[0].id);
    completeTask(s, ftai.id, { when: '2026-11-22T10:00' });
    expect(tasksOf(s, s.protocols[0].id).filter((t) => t.status === 'Cancelled')).toHaveLength(3);
  });
  it('the PD result updates the AI record and the protocol', () => {
    const s = started();
    const [, , , ftai] = tasksOf(s, s.protocols[0].id);
    completeTask(s, ftai.id, { when: '2026-11-22T10:00' });
    const pd = tasksOf(s, s.protocols[0].id).find((t) => t.stepKey === 'pd');
    completeTask(s, pd.id, { when: '2026-12-24T09:00', pdResult: 'pregnant' });
    expect(s.breedingRecords[0].pregStatus).toBe('Confirmed Pregnant');
    expect(s.protocols[0].pdResult).toBe('Pregnant');
    const s2 = started();
    const ftai2 = tasksOf(s2, s2.protocols[0].id)[3];
    completeTask(s2, ftai2.id, { when: '2026-11-22T10:00' });
    completeTask(s2, tasksOf(s2, s2.protocols[0].id).find((t) => t.stepKey === 'pd').id, { pdResult: 'open' });
    expect(s2.breedingRecords[0].pregStatus).toBe('Repeat / Not Pregnant');
  });
  it('early heat logs the AI now and cancels the remaining injections', () => {
    const s = started('double-ovsynch');
    const [first] = tasksOf(s, s.protocols[0].id);
    completeTask(s, first.id);
    const record = earlyHeat(s, s.protocols[0].id, { when: '2026-11-17T07:30', sire: 'Sahiwal #9' });
    expect(record).toMatchObject({ aiDate: '2026-11-17', semenBull: 'Sahiwal #9', pregStatus: 'Awaiting PD Check' });
    expect(record.notes).toContain('Early heat');
    const tasks = tasksOf(s, s.protocols[0].id);
    expect(tasks.filter((t) => t.status === 'Cancelled' && t.cancelReason === 'Early heat')).toHaveLength(6);
    expect(tasks.find((t) => t.stepKey === 'pd').dueAt).toBe('2026-12-19T08:00');
    expect(s.protocols[0]).toMatchObject({ status: 'Bred', bredVia: 'Early heat' });
    expect(earlyHeat(s, s.protocols[0].id, {})).toBeNull();               // not twice
  });
  it('cancel stops the protocol; a finished or cancelled protocol lets her start a new one', () => {
    const s = started();
    expect(cancelProtocol(s, s.protocols[0].id, 'Sold')).toBe(true);
    expect(tasksOf(s, s.protocols[0].id).every((t) => t.status === 'Cancelled')).toBe(true);
    expect(cancelProtocol(s, s.protocols[0].id)).toBe(false);
    const again = enrollProtocol(s, { tags: ['Wachi #01 (Noori)'], template: 'ovsynch', day0: '2026-12-01T08:00' });
    expect(again.started).toHaveLength(1);
  });
  it('skipping one step keeps the protocol going', () => {
    const s = started();
    const [g1] = tasksOf(s, s.protocols[0].id);
    expect(skipTask(s, g1.id)).toBe(true);
    expect(s.protocols[0].status).toBe('Active');
    expect(skipTask(s, g1.id)).toBe(false);
  });
  it('protocolView reports progress and the next step', () => {
    const s = started();
    const [g1] = tasksOf(s, s.protocols[0].id);
    completeTask(s, g1.id);
    const v = protocolView(s, s.protocols[0]);
    expect(v).toMatchObject({ done: 1, total: 4, nextNumber: 2 });
    expect(v.next.type).toBe('PGF2α');
  });
});
