// Crop and land records: every crop keeps cost lines and harvests; the totals are always derived from them.
export const ACRES_PER = { Acre: 1, Kanal: 1 / 8, Marla: 1 / 160 };

export const CROPS = ['Wheat', 'Barseem (Egyptian Clover)', 'Alfalfa (Lucerne)', 'Kamand', 'Maize (Corn)', 'Sorghum (Jowar)', 'Millet (Bajra)', 'Rice (Paddy)', 'Cotton', 'Sugarcane', 'Mustard (Sarson)', 'Oats (Jai)', 'Vegetables', 'Other'];
export const SEASONS = ['Rabi (Winter)', 'Kharif (Summer)', 'Year-round'];
export const WATER_SOURCES = ['Tubewell - Diesel', 'Tubewell - Solar', 'Tubewell - Electric', 'Rented Tubewell', 'Canal (Nehri)', 'Rain-fed', 'Other'];
export const COST_CATEGORIES = ['Land Rent (Theeka)', 'Land Preparation', 'Seed', 'Water / Irrigation', 'Fertiliser', 'Pesticide / Spray', 'Labour', 'Harvesting', 'Transport', 'Other'];
export const YIELD_UNITS = ['Maund (40 kg)', 'Kg', 'Ton', 'Trolley', 'Bundles'];

const num = (v) => Number(v) || 0;

export function areaAcres(area, unit) {
  return num(area) * (ACRES_PER[unit] ?? 1);
}

/** Cost, income and profit of one crop, derived from its cost lines and harvests. */
export function cropTotals(crop) {
  const byCategory = {};
  let cost = 0;
  for (const line of crop.costs || []) {
    const amount = num(line.amount);
    cost += amount;
    byCategory[line.category] = (byCategory[line.category] || 0) + amount;
  }
  let income = 0;
  const yields = {};
  for (const h of crop.harvests || []) {
    income += num(h.income);
    if (num(h.qty) > 0) yields[h.unit || ''] = (yields[h.unit || ''] || 0) + num(h.qty);
  }
  const acres = areaAcres(crop.area, crop.areaUnit);
  const net = income - cost;
  return {
    cost, income, net, byCategory, yields, acres,
    costPerAcre: acres > 0 ? cost / acres : null,
    netPerAcre: acres > 0 ? net / acres : null,
    margin: income > 0 ? Math.round((net / income) * 100) : null,
    hasHarvest: (crop.harvests || []).length > 0
  };
}

/** Totals over many crops, plus one row per crop name ("By crop"). */
export function cropsSummary(crops) {
  const all = { cost: 0, income: 0, net: 0, count: crops.length, acres: 0 };
  const byName = new Map();
  for (const c of crops) {
    const t = cropTotals(c);
    all.cost += t.cost; all.income += t.income; all.acres += t.acres;
    const name = c.crop === 'Other' && c.cropOther ? c.cropOther : c.crop;
    const row = byName.get(name) || { name, cost: 0, income: 0, net: 0, count: 0 };
    row.cost += t.cost; row.income += t.income; row.count++;
    row.net = row.income - row.cost;
    byName.set(name, row);
  }
  all.net = all.income - all.cost;
  return { ...all, byCrop: [...byName.values()].sort((a, b) => b.net - a.net) };
}

/** Seed needed in kg for the area, from a seed rate in kg per acre. */
export function seedNeededKg(seedRatePerAcre, area, unit) {
  return Math.round(num(seedRatePerAcre) * areaAcres(area, unit) * 10) / 10;
}

export const cropDisplayName = (c) => (c.crop === 'Other' && c.cropOther ? c.cropOther : c.crop);
