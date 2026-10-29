// Three-way merge of farm records so two devices that edited offline don't clobber each other.
//   base   - the snapshot both sides last agreed on
//   local  - this device now
//   remote - the cloud now
// Records are matched by `id`. An edit beats a delete; if both sides edited the same record, local wins.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const byId = (list) => new Map((list || []).filter((r) => r && r.id != null).map((r) => [r.id, r]));

export function mergeCollection(base, local, remote) {
  const B = byId(base);
  const L = byId(local);
  const R = byId(remote);
  const kept = new Map();

  for (const [id, l] of L) {
    const r = R.get(id);
    const b = B.get(id);
    if (r) {
      if (same(l, r)) kept.set(id, l);
      else if (b && !same(r, b) && same(l, b)) kept.set(id, r); // only remote edited
      else kept.set(id, l); // local edited, or both did
    } else if (b) {
      // deleted remotely: keep only if edited locally since the base
      if (!same(l, b)) kept.set(id, l);
    } else {
      kept.set(id, l); // added locally
    }
  }

  const remoteAdded = [];
  for (const [id, r] of R) {
    if (L.has(id)) continue;
    const b = B.get(id);
    // deleted locally: keep only if edited remotely since the base
    if (b && same(r, b)) continue;
    remoteAdded.push(r);
  }

  // Lists are newest-first; surface what arrived from the cloud ahead of local records.
  const idless = (local || []).filter((r) => !r || r.id == null);
  return [...remoteAdded, ...(local || []).filter((r) => r && kept.has(r.id)).map((r) => kept.get(r.id)), ...idless];
}

export function mergeSnapshots(base, local, remote) {
  const keys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
  const out = {};
  for (const key of keys) {
    out[key] = mergeCollection(base?.[key], local?.[key], remote?.[key]);
  }
  return out;
}

export function snapshotsEqual(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    if (!same(a?.[key] ?? [], b?.[key] ?? [])) return false;
  }
  return true;
}

export function isEmptySnapshot(snap) {
  return Object.values(snap || {}).every((list) => !Array.isArray(list) || list.length === 0);
}
