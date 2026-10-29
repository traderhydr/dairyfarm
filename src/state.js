// Single source of truth for farm records. Views read `state` and call `commit()`
// after mutating it; `commit()` persists and notifies subscribers (re-render, sync).
import { SAMPLE_DATA } from './sample-data.js';

const STORAGE_KEYS = {
  transactions: 'dairy_farm_v1_transactions',
  breedingRecords: 'dairy_farm_v1_breeding',
  wandaBatches: 'dairy_farm_v1_wanda',
  milkersList: 'dairy_farm_v1_milkers',
  wachiList: 'dairy_farm_v1_wachi',
  healthRecords: 'dairy_farm_v1_health',
  cattleSales: 'dairy_farm_v1_sales',
  doodhiAccounts: 'dairy_farm_v1_doodhi'
};

export const COLLECTIONS = Object.keys(STORAGE_KEYS);

export const state = Object.fromEntries(COLLECTIONS.map((name) => [name, []]));

const listeners = new Set();

/** Subscribe to state changes. `source` is 'local' for edits made on this device. */
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(source) {
  listeners.forEach((fn) => fn(source));
}

export function loadState() {
  for (const name of COLLECTIONS) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS[name]);
      const parsed = raw ? JSON.parse(raw) : [];
      state[name] = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      state[name] = [];
    }
  }
}

export function saveState() {
  try {
    for (const name of COLLECTIONS) {
      localStorage.setItem(STORAGE_KEYS[name], JSON.stringify(state[name]));
    }
  } catch (e) {
    // Ignore storage quota or sandbox restriction errors
  }
}

/** Persist the current state and tell subscribers it changed. */
export function commit(source = 'local') {
  saveState();
  notify(source);
}

/** Copy of all collections as a plain object (backups, cloud sync). */
export function snapshot() {
  return Object.fromEntries(COLLECTIONS.map((name) => [name, state[name]]));
}

/** Replace the named collections with the arrays found in `data` (others untouched). */
export function importData(data, source = 'local') {
  for (const name of COLLECTIONS) {
    if (Array.isArray(data?.[name])) state[name] = data[name];
  }
  commit(source);
}

/** Replace every collection; missing ones become empty. */
export function replaceAll(data, source = 'local') {
  for (const name of COLLECTIONS) {
    state[name] = Array.isArray(data?.[name]) ? data[name] : [];
  }
  commit(source);
}

export function loadSampleData() {
  replaceAll(structuredClone(SAMPLE_DATA));
}

export function clearAllData() {
  replaceAll({});
}
