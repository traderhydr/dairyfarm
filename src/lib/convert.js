// Moving one animal between the Milkers list and the Wachi (heifer) list, for when she was put in the wrong one.
// Her tag, species, breed, mark, notes and mother are kept; the new list's own details start at a simple default.

/** Wachi -> Milker. Returns the new milker, or null if the wachi is not found. */
export function wachiToMilker(state, id) {
  const w = (state.wachiList || []).find((x) => x.id === id);
  if (!w) return null;
  const milker = {
    id: 'milker-' + Date.now(), tag: w.tag, species: w.species, breed: w.breed,
    morningMilk: 0, eveningMilk: 0, status: 'Steady Milking', notes: w.notes || '',
    ...(w.mark ? { mark: w.mark } : {}), ...(w.damTag ? { damTag: w.damTag } : {})
  };
  state.wachiList = state.wachiList.filter((x) => x.id !== id);
  state.milkersList = [milker, ...(state.milkersList || [])];
  return milker;
}

/** Milker -> Wachi. Age and weight are unknown, so they start at 0 for the farmer to fill in. */
export function milkerToWachi(state, id) {
  const m = (state.milkersList || []).find((x) => x.id === id);
  if (!m) return null;
  const wachi = {
    id: 'wachi-' + Date.now(), tag: m.tag, species: m.species, breed: m.breed,
    ageMonths: 0, weightKg: 0, stage: 'Growing Wachi (6–15 Months)', notes: m.notes || '',
    ...(m.mark ? { mark: m.mark } : {}), ...(m.damTag ? { damTag: m.damTag } : {})
  };
  state.milkersList = state.milkersList.filter((x) => x.id !== id);
  state.wachiList = [wachi, ...(state.wachiList || [])];
  return wachi;
}
