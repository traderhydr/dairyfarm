import { describe, expect, it } from 'vitest';
import { areaAcres, cropDisplayName, cropsSummary, cropTotals, seedNeededKg } from '../../src/lib/crops.js';

const wheat = {
  id: 'c1', crop: 'Wheat', area: 4, areaUnit: 'Acre',
  costs: [
    { category: 'Land Preparation', amount: 12000 },
    { category: 'Seed', amount: 20000 },
    { category: 'Fertiliser', amount: 30000 },
    { category: 'Fertiliser', amount: 8000 },
    { category: 'Labour', amount: 10000 }
  ],
  harvests: [{ qty: 160, unit: 'Maund (40 kg)', income: 288000 }]
};

describe('areaAcres', () => {
  it('converts kanal and marla', () => {
    expect(areaAcres(2, 'Acre')).toBe(2);
    expect(areaAcres(8, 'Kanal')).toBe(1);
    expect(areaAcres(160, 'Marla')).toBe(1);
    expect(areaAcres('', 'Acre')).toBe(0);
  });
});

describe('cropTotals', () => {
  it('sums costs by category and works out profit and per-acre figures', () => {
    const t = cropTotals(wheat);
    expect(t.cost).toBe(80000);
    expect(t.byCategory.Fertiliser).toBe(38000);
    expect(t.income).toBe(288000);
    expect(t.net).toBe(208000);
    expect(t.costPerAcre).toBe(20000);
    expect(t.netPerAcre).toBe(52000);
    expect(t.margin).toBe(72);
    expect(t.yields).toEqual({ 'Maund (40 kg)': 160 });
  });
  it('shows a loss when costs are higher than income, and handles a crop with no harvest yet', () => {
    const t = cropTotals({ ...wheat, harvests: [{ qty: 10, unit: 'Kg', income: 5000 }] });
    expect(t.net).toBe(-75000);
    const growing = cropTotals({ crop: 'Barseem', area: 1, areaUnit: 'Kanal', costs: [{ category: 'Seed', amount: 500 }] });
    expect(growing).toMatchObject({ cost: 500, income: 0, net: -500, hasHarvest: false, margin: null });
    expect(growing.costPerAcre).toBe(4000);
  });
  it('keeps several cuttings (harvests) together and ignores bad numbers', () => {
    const t = cropTotals({ area: 2, areaUnit: 'Acre', costs: [{ category: 'Seed', amount: 'x' }], harvests: [{ qty: 5, unit: 'Trolley', income: 1000 }, { qty: 7, unit: 'Trolley', income: 1400 }] });
    expect(t.cost).toBe(0);
    expect(t.income).toBe(2400);
    expect(t.yields).toEqual({ Trolley: 12 });
  });
  it('has no per-acre figures without an area', () => {
    expect(cropTotals({ costs: [{ amount: 5 }] }).costPerAcre).toBeNull();
  });
});

describe('cropsSummary', () => {
  it('totals all crops and groups them by crop name, best first', () => {
    const s = cropsSummary([wheat, { ...wheat, id: 'c2' }, { id: 'c3', crop: 'Other', cropOther: 'Tobacco', area: 1, areaUnit: 'Acre', costs: [{ amount: 100 }], harvests: [] }]);
    expect(s.cost).toBe(160100);
    expect(s.income).toBe(576000);
    expect(s.net).toBe(415900);
    expect(s.byCrop.map((r) => r.name)).toEqual(['Wheat', 'Tobacco']);
    expect(s.byCrop[0]).toMatchObject({ count: 2, net: 416000 });
  });
});

describe('seedNeededKg / cropDisplayName', () => {
  it('multiplies the seed rate by the area', () => {
    expect(seedNeededKg(50, 4, 'Acre')).toBe(200);
    expect(seedNeededKg(50, 4, 'Kanal')).toBe(25);
  });
  it('uses the typed name for Other', () => {
    expect(cropDisplayName({ crop: 'Other', cropOther: 'Tobacco' })).toBe('Tobacco');
    expect(cropDisplayName({ crop: 'Wheat' })).toBe('Wheat');
  });
});
