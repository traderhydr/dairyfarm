import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSyncEngine } from '../../src/cloud/sync-engine.js';

/** In-memory stand-in for the cloud row, with the same optimistic-concurrency rule as Supabase. */
function fakeRemote(initial = null) {
  const r = {
    doc: initial,
    pushes: 0,
    listeners: new Set(),
    failNext: 0,
    async fetch() {
      if (r.failNext > 0) { r.failNext--; throw new Error('network down'); }
      return r.doc ? structuredClone(r.doc) : null;
    },
    async push(data, expected) {
      r.pushes++;
      const current = r.doc ? r.doc.version : 0;
      if (current !== expected) return { ok: false };
      r.doc = { data: structuredClone(data), version: current + 1 };
      return { ok: true, version: r.doc.version };
    },
    subscribe(cb) { r.listeners.add(cb); return () => r.listeners.delete(cb); },
    emit() { r.listeners.forEach((cb) => cb()); }
  };
  return r;
}

function memStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

function device(remote, local = {}, storage = memStorage()) {
  const dev = { local, statuses: [], storage };
  dev.engine = createSyncEngine({
    remote,
    storage,
    debounceMs: 10,
    retryMs: 10,
    getLocal: () => dev.local,
    applyLocal: (data) => { dev.local = structuredClone(data); },
    onStatus: (s) => dev.statuses.push(s.state)
  });
  return dev;
}

const rec = (id, v = 1) => ({ id, v });
beforeEach(() => vi.useRealTimers());

describe('sync engine', () => {
  it('first login with local data and an empty cloud uploads the local data', async () => {
    const remote = fakeRemote();
    const a = device(remote, { tx: [rec('1')] });
    await a.engine.start('u1');
    expect(remote.doc.data).toEqual({ tx: [rec('1')] });
    expect(a.statuses.at(-1)).toBe('synced');
  });

  it('first login on a new empty device downloads the cloud data', async () => {
    const remote = fakeRemote({ data: { tx: [rec('1')] }, version: 3 });
    const b = device(remote, { tx: [] });
    await b.engine.start('u1');
    expect(b.local).toEqual({ tx: [rec('1')] });
    expect(remote.pushes).toBe(0);
  });

  it('first login with data on both sides merges instead of overwriting', async () => {
    const remote = fakeRemote({ data: { tx: [rec('cloud')] }, version: 2 });
    const a = device(remote, { tx: [rec('mine')] });
    await a.engine.start('u1');
    expect(a.local.tx.map((r) => r.id).sort()).toEqual(['cloud', 'mine']);
    expect(remote.doc.data.tx.map((r) => r.id).sort()).toEqual(['cloud', 'mine']);
  });

  it('pushes local edits after the debounce and does not push when nothing changed', async () => {
    const remote = fakeRemote();
    const a = device(remote, { tx: [] });
    await a.engine.start('u1');
    const before = remote.pushes;
    await a.engine.syncNow();
    expect(remote.pushes).toBe(before);

    a.local = { tx: [rec('1')] };
    a.engine.notifyLocalChange();
    await new Promise((r) => setTimeout(r, 60));
    expect(remote.doc.data).toEqual({ tx: [rec('1')] });
  });

  it('two devices editing offline converge without losing either edit', async () => {
    const remote = fakeRemote();
    const a = device(remote, { tx: [rec('shared')] });
    await a.engine.start('u1');
    const b = device(remote, { tx: [] });
    await b.engine.start('u1');
    expect(b.local.tx).toEqual([rec('shared')]);

    a.local = { tx: [rec('fromA'), rec('shared')] };
    b.local = { tx: [rec('fromB'), rec('shared')] };
    await a.engine.syncNow();
    await b.engine.syncNow();
    await a.engine.syncNow();

    const ids = (d) => d.local.tx.map((r) => r.id).sort();
    expect(ids(a)).toEqual(['fromA', 'fromB', 'shared']);
    expect(ids(b)).toEqual(['fromA', 'fromB', 'shared']);
    expect(remote.doc.data.tx.length).toBe(3);
  });

  it('propagates a delete to the other device', async () => {
    const remote = fakeRemote();
    const a = device(remote, { tx: [rec('x'), rec('y')] });
    await a.engine.start('u1');
    const b = device(remote, { tx: [] });
    await b.engine.start('u1');

    a.local = { tx: [rec('y')] };
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(b.local.tx).toEqual([rec('y')]);
  });

  it('a realtime notification triggers a pull', async () => {
    const remote = fakeRemote();
    const a = device(remote, { tx: [] });
    await a.engine.start('u1');
    remote.doc = { data: { tx: [rec('new')] }, version: remote.doc.version + 1 };
    remote.emit();
    await new Promise((r) => setTimeout(r, 400));
    expect(a.local.tx).toEqual([rec('new')]);
  });

  it('reports an error then recovers on retry', async () => {
    const remote = fakeRemote();
    remote.failNext = 1;
    const a = device(remote, { tx: [rec('1')] });
    await a.engine.start('u1');
    expect(a.statuses).toContain('error');
    await new Promise((r) => setTimeout(r, 80));
    expect(a.statuses.at(-1)).toBe('synced');
    expect(remote.doc.data).toEqual({ tx: [rec('1')] });
    a.engine.stop();
  });

  it('stop() prevents further syncing', async () => {
    const remote = fakeRemote();
    const a = device(remote, { tx: [] });
    await a.engine.start('u1');
    a.engine.stop();
    a.local = { tx: [rec('1')] };
    a.engine.notifyLocalChange();
    await new Promise((r) => setTimeout(r, 50));
    expect(remote.doc.data).toEqual({ tx: [] });
  });
});
