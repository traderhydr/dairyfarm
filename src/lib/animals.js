import { BREEDING_CATEGORY } from './protocols.js';

// Animal profiles are built from the records that already exist (Milkers, Wachi, Cow AI, Health, Sold Cows),
// joined by the animal's tag. Tags are free text, so two tags are "the same animal" when all the words of the
// shorter one appear in the longer one ("Cow #07" matches "Cow #07 (Chandi)", but not "Cow #14 (Rani)").

const words = (tag) => new Set(String(tag || '').toLowerCase().match(/[a-z0-9\u0600-\u06ff]+/g) || []);

export function sameAnimal(a, b) {
  const ta = words(a);
  const tb = words(b);
  if (!ta.size || !tb.size) return false;
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  if (small.size < 2 && small.size !== big.size) return false;
  return [...small].every((w) => big.has(w));
}

/** The mother named in a calf's breed text, e.g. "HF Cross (Dam: Cow #07 Chandi)"; '' if none. */
export function damOf(wachi) {
  if (wachi.damTag) return wachi.damTag;
  const m = /dam\s*[:\-]\s*([^)]+)\)?/i.exec(wachi.breed || '');
  return m ? m[1].trim() : '';
}

/** Sales that include this animal, newest first: sold herself, or sold together with her mother. */
export function salesOf(tag, sales) {
  return (sales || [])
    .filter((s) => sameAnimal(s.cowTag, tag) || (s.withCalves || []).some((c) => sameAnimal(c.tag, tag)))
    .sort((a, b) => String(b.saleDate).localeCompare(String(a.saleDate)));
}

/** Everything known about one animal. `tag` is any text that identifies her. */
export function buildProfile(tag, state) {
  const milker = (state.milkersList || []).find((m) => sameAnimal(m.tag, tag)) || null;
  const wachi = (state.wachiList || []).find((w) => sameAnimal(w.tag, tag)) || null;
  const goat = milker || wachi ? null : (state.goats || []).find((g) => sameAnimal(g.tag, tag)) || null;
  const horse = milker || wachi || goat ? null : (state.horses || []).find((h) => sameAnimal(h.name, tag)) || null;
  const record = milker || wachi || goat || horse;
  const recordTag = goat ? goat.tag : horse ? horse.name : record ? record.tag : '';
  const displayTag = record ? recordTag : tag;

  const ai = (state.breedingRecords || [])
    .filter((r) => sameAnimal(r.cowTag, displayTag))
    .sort((a, b) => String(b.aiDate).localeCompare(String(a.aiDate)));

  // breeding-protocol steps are shown in the Breeding section, not in the treatment list
  const health = (state.healthRecords || [])
    .filter((h) => h.category !== BREEDING_CATEGORY && sameAnimal(h.target, displayTag))
    .sort((a, b) => String(b.dateGiven).localeCompare(String(a.dateGiven)));

  const protocols = (state.protocols || [])
    .filter((p) => sameAnimal(p.animalTag, displayTag))
    .sort((a, b) => String(b.day0).localeCompare(String(a.day0)));

  const sales = salesOf(displayTag, state.cattleSales);
  const soldAsCalf = (sales[0]?.withCalves || []).some((c) => sameAnimal(c.tag, displayTag)) && !sameAnimal(sales[0].cowTag, displayTag);

  // Calves: those recorded at calving, plus any Wachi whose dam is this animal
  const calves = [];
  const addCalf = (c) => {
    const found = calves.find((x) => sameAnimal(x.tag, c.tag));
    if (found) Object.assign(found, Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined && v !== '')));
    else calves.push({ ...c });
  };
  ai.forEach((r) => (r.calves || []).forEach((c) => addCalf({ tag: c.tag, born: c.date, weightKg: c.weight })));
  (state.wachiList || []).forEach((w) => {
    const dam = damOf(w);
    if (dam && sameAnimal(dam, displayTag) && !sameAnimal(w.tag, displayTag)) {
      addCalf({ id: w.id, tag: w.tag, stage: w.stage, ageMonths: w.ageMonths, weightKg: w.weightKg, inHerd: true });
    }
  });
  calves.forEach((c) => {
    const sale = salesOf(c.tag, state.cattleSales)[0];
    if (sale) c.sale = sale;
  });

  const open = ai.find((r) => r.pregStatus !== 'Calved' && r.pregStatus !== 'Repeat / Not Pregnant');
  const dam = wachi ? damOf(wachi) : '';
  const kind = milker ? 'milker' : wachi ? 'wachi' : goat ? 'goat' : horse ? 'horse' : (sales[0]?.animal?.kind || 'other');
  const sold = sales.length > 0 || ((goat || horse) && (goat || horse).status === 'Sold') || false;

  return {
    tag: displayTag, kind, milker, wachi, goat, horse, record, dam, ai, health, protocols, calves, sales, sold, soldAsCalf,
    pregnancy: open || null,
    inHerd: Boolean(record) && !sold && !['Sold', 'Died'].includes(record.status)
  };
}

/** One row per animal for the Animals list: herd animals first, then animals only known from other records. */
export function listAnimals(state) {
  const items = [];
  const add = (tag) => {
    if (!String(tag || '').trim()) return;
    if (items.some((a) => sameAnimal(a.tag, tag))) return;
    items.push({ tag: String(tag).trim() });
  };
  (state.milkersList || []).forEach((m) => add(m.tag));
  (state.wachiList || []).forEach((w) => add(w.tag));
  (state.breedingRecords || []).forEach((r) => add(r.cowTag));
  (state.goats || []).forEach((g) => add(g.tag));
  (state.horses || []).forEach((h) => add(h.name));
  (state.cattleSales || []).forEach((s) => add(s.cowTag));
  return items.map((a) => buildProfile(a.tag, state));
}
