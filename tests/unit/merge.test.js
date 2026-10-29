import { describe, expect, it } from 'vitest';
import { isEmptySnapshot, mergeCollection, mergeSnapshots, snapshotsEqual } from '../../src/cloud/merge.js';

const rec = (id, v = 1) => ({ id, v });
const ids = (list) => list.map((r) => r.id);

describe('mergeCollection', () => {
  it('keeps records added on either side', () => {
    const out = mergeCollection([rec('a')], [rec('l'), rec('a')], [rec('r'), rec('a')]);
    expect(ids(out).sort()).toEqual(['a', 'l', 'r']);
  });

  it('takes the remote edit when only remote changed', () => {
    const out = mergeCollection([rec('a', 1)], [rec('a', 1)], [rec('a', 2)]);
    expect(out).toEqual([rec('a', 2)]);
  });

  it('takes the local edit when only local changed', () => {
    const out = mergeCollection([rec('a', 1)], [rec('a', 3)], [rec('a', 1)]);
    expect(out).toEqual([rec('a', 3)]);
  });

  it('local wins when both edited the same record', () => {
    const out = mergeCollection([rec('a', 1)], [rec('a', 3)], [rec('a', 2)]);
    expect(out).toEqual([rec('a', 3)]);
  });

  it('propagates deletes made on one side', () => {
    expect(mergeCollection([rec('a'), rec('b')], [rec('b')], [rec('a'), rec('b')])).toEqual([rec('b')]); // local deleted a
    expect(mergeCollection([rec('a'), rec('b')], [rec('a'), rec('b')], [rec('b')])).toEqual([rec('b')]); // remote deleted a
  });

  it('an edit beats a delete', () => {
    expect(mergeCollection([rec('a', 1)], [rec('a', 2)], [])).toEqual([rec('a', 2)]); // remote deleted, local edited
    expect(mergeCollection([rec('a', 1)], [], [rec('a', 2)])).toEqual([rec('a', 2)]); // local deleted, remote edited
  });

  it('with no base, unions both sides and local wins on identical ids', () => {
    const out = mergeCollection([], [rec('a', 1), rec('l')], [rec('a', 2), rec('r')]);
    expect(out.find((r) => r.id === 'a').v).toBe(1);
    expect(ids(out).sort()).toEqual(['a', 'l', 'r']);
  });

  it('puts cloud-only additions ahead of local records (newest-first lists)', () => {
    expect(ids(mergeCollection([], [rec('l')], [rec('r')]))).toEqual(['r', 'l']);
  });

  it('tolerates missing lists', () => {
    expect(mergeCollection(undefined, undefined, undefined)).toEqual([]);
  });
});

describe('snapshot helpers', () => {
  it('merges every collection', () => {
    const out = mergeSnapshots({}, { a: [rec('1')] }, { b: [rec('2')] });
    expect(out).toEqual({ a: [rec('1')], b: [rec('2')] });
  });

  it('compares snapshots ignoring empty vs missing collections', () => {
    expect(snapshotsEqual({ a: [] }, {})).toBe(true);
    expect(snapshotsEqual({ a: [rec('1')] }, { a: [rec('1', 2)] })).toBe(false);
  });

  it('detects empty snapshots', () => {
    expect(isEmptySnapshot({ a: [], b: [] })).toBe(true);
    expect(isEmptySnapshot({ a: [rec('1')] })).toBe(false);
  });
});
