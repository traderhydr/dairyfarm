// Cattle on the farm are cows or buffaloes. They differ where it matters for breeding: a buffalo carries
// her calf about 310 days (a cow 283), so her dry-off and calving dates are later.
export const SPECIES = ['Cow', 'Buffalo'];
export const GESTATION = { Cow: 283, Buffalo: 310 };
export const DRY_OFF_BEFORE_CALVING = 60;

export const normalizeSpecies = (value) => (value === 'Buffalo' ? 'Buffalo' : 'Cow');
export const gestationDays = (species) => GESTATION[normalizeSpecies(species)];
export const dryOffDay = (species) => gestationDays(species) - DRY_OFF_BEFORE_CALVING;
export const speciesEmoji = (species) => (normalizeSpecies(species) === 'Buffalo' ? '\u{1F403}' : '\u{1F404}');
