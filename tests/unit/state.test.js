import { beforeEach, describe, expect, it, vi } from 'vitest';

function fakeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    clear: () => store.clear()
  };
}

let mod;
beforeEach(async () => {
  vi.stubGlobal('localStorage', fakeStorage());
  vi.resetModules();
  mod = await import('../../src/state.js');
});

describe('state store', () => {
  it('starts empty for new users', () => {
    mod.loadState();
    for (const name of mod.COLLECTIONS) expect(mod.state[name]).toEqual([]);
  });

  it('persists on commit and reloads', () => {
    mod.state.transactions.push({ id: 'tx-1', amount: 5 });
    mod.commit();
    mod.state.transactions = [];
    mod.loadState();
    expect(mod.state.transactions).toEqual([{ id: 'tx-1', amount: 5 }]);
  });

  it('notifies subscribers with the change source', () => {
    const fn = vi.fn();
    mod.onChange(fn);
    mod.commit();
    mod.commit('remote');
    expect(fn.mock.calls).toEqual([['local'], ['remote']]);
  });

  it('loads and clears sample data', () => {
    mod.loadSampleData();
    expect(mod.state.transactions.length).toBeGreaterThan(0);
    mod.clearAllData();
    for (const name of mod.COLLECTIONS) expect(mod.state[name]).toEqual([]);
  });

  it('importData only replaces collections present in the backup', () => {
    mod.state.wachiList = [{ id: 'w' }];
    mod.importData({ transactions: [{ id: 't' }], milkersList: 'not-an-array' });
    expect(mod.state.transactions).toEqual([{ id: 't' }]);
    expect(mod.state.wachiList).toEqual([{ id: 'w' }]);
    expect(mod.state.milkersList).toEqual([]);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('dairy_farm_v1_transactions', '{broken');
    mod.loadState();
    expect(mod.state.transactions).toEqual([]);
  });
});
