// Offline-first sync of one JSON document per user, with optimistic concurrency.
//
// `remote` must provide:
//   fetch()                       -> { data, version } | null
//   push(data, expectedVersion)   -> { ok: true, version } | { ok: false }   (expectedVersion 0 = create)
//   subscribe(onChange)           -> unsubscribe function
import { isEmptySnapshot, mergeSnapshots, snapshotsEqual } from './merge.js';

const MAX_ATTEMPTS = 4;

export function createSyncEngine({
  remote,
  getLocal,
  applyLocal,
  storage = globalThis.localStorage,
  onStatus = () => {},
  debounceMs = 1500,
  retryMs = 15000
}) {
  let userId = null;
  let unsubscribe = null;
  let running = null;
  let rerun = false;
  let debounceTimer = null;
  let retryTimer = null;
  let failures = 0;

  const baseKey = () => `dairy_cloud_base_${userId}`;
  const loadBase = () => {
    try {
      return JSON.parse(storage.getItem(baseKey()) || 'null');
    } catch (e) {
      return null;
    }
  };
  const saveBase = (version, data) => {
    try {
      storage.setItem(baseKey(), JSON.stringify({ version, data }));
    } catch (e) {
      // storage full/unavailable: next sync just re-merges from scratch
    }
  };

  const setStatus = (state, extra = {}) => onStatus({ state, ...extra });

  async function syncOnce() {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const doc = await remote.fetch();
      const local = getLocal();

      if (!doc) {
        const res = await remote.push(local, 0);
        if (res.ok) return saveBase(res.version, local);
        continue; // someone created it in the meantime
      }

      const base = loadBase();
      let target;
      if (!base) {
        if (isEmptySnapshot(local)) target = doc.data;
        else if (isEmptySnapshot(doc.data)) target = local;
        else target = mergeSnapshots({}, local, doc.data);
      } else if (doc.version === base.version) {
        target = local;
      } else {
        target = mergeSnapshots(base.data, local, doc.data);
      }

      if (!snapshotsEqual(target, local)) applyLocal(target);
      if (snapshotsEqual(target, doc.data)) return saveBase(doc.version, target);

      const res = await remote.push(target, doc.version);
      if (res.ok) return saveBase(res.version, target);
    }
    throw new Error('Could not sync after several attempts');
  }

  function syncNow() {
    if (!userId) return Promise.resolve();
    if (running) {
      rerun = true;
      return running;
    }
    clearTimeout(debounceTimer);
    clearTimeout(retryTimer);
    setStatus('syncing');
    running = (async () => {
      try {
        await syncOnce();
        failures = 0;
        setStatus('synced', { at: Date.now() });
      } catch (err) {
        failures += 1;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        setStatus(offline ? 'offline' : 'error', { message: err?.message || String(err) });
        retryTimer = setTimeout(syncNow, Math.min(retryMs * failures, 5 * 60 * 1000));
      } finally {
        running = null;
        if (rerun) {
          rerun = false;
          syncNow();
        }
      }
    })();
    return running;
  }

  function notifyLocalChange() {
    if (!userId) return;
    setStatus('pending');
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncNow, debounceMs);
  }

  const onOnline = () => syncNow();
  const onVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') syncNow();
  };

  return {
    start(id) {
      this.stop();
      userId = id;
      unsubscribe = remote.subscribe(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(syncNow, 300);
      });
      globalThis.addEventListener?.('online', onOnline);
      globalThis.document?.addEventListener?.('visibilitychange', onVisible);
      return syncNow();
    },
    stop() {
      userId = null;
      clearTimeout(debounceTimer);
      clearTimeout(retryTimer);
      unsubscribe?.();
      unsubscribe = null;
      globalThis.removeEventListener?.('online', onOnline);
      globalThis.document?.removeEventListener?.('visibilitychange', onVisible);
    },
    /** Forget the sync baseline for the current user (used when signing out). */
    forgetBase() {
      if (userId) storage.removeItem(baseKey());
    },
    syncNow,
    notifyLocalChange
  };
}
