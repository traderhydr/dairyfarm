// How many animals the farm has: cows, buffaloes, heifers (Wachi), goats and sheep, horses.
import { normalizeSpecies } from './species.js';

const alive = (rec) => rec.status !== 'Sold' && rec.status !== 'Died';

export function herdCounts(state) {
  const milkers = state.milkersList || [];
  const wachi = state.wachiList || [];
  const cows = milkers.filter((m) => normalizeSpecies(m.species) === 'Cow').length;
  const buffaloes = milkers.length - cows;
  const heifers = wachi.length;
  const flock = (species) => (state.goats || [])
    .filter((g) => alive(g) && g.species === species)
    .reduce((sum, g) => sum + Math.max(1, Number(g.count) || 1), 0);
  const goats = flock('Goat');
  const sheep = flock('Sheep');
  const horses = (state.horses || []).filter(alive).length;
  return {
    cows, buffaloes, heifers, goats, sheep, horses,
    milking: milkers.length,
    heifersCow: wachi.filter((w) => normalizeSpecies(w.species) === 'Cow').length,
    heifersBuffalo: wachi.filter((w) => normalizeSpecies(w.species) === 'Buffalo').length,
    total: cows + buffaloes + heifers + goats + sheep + horses
  };
}
