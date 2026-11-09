import { describe, expect, it } from 'vitest';
import { buildProfile, damOf, listAnimals, sameAnimal } from '../../src/lib/animals.js';

describe('sameAnimal', () => {
  it('matches when all words of the shorter tag appear in the longer one', () => {
    expect(sameAnimal('Cow #07 (Chandi)', 'Cow #07 Chandi')).toBe(true);
    expect(sameAnimal('Cow #07', 'Cow #07 (Chandi)')).toBe(true);
    expect(sameAnimal('cow #07 (chandi)', 'COW #07 (CHANDI — Holstein Friesian)')).toBe(true);
  });
  it('keeps different animals apart', () => {
    expect(sameAnimal('Cow #07 (Chandi)', 'Cow #14 (Rani)')).toBe(false);
    expect(sameAnimal('Cow #1', 'Cow #14 (Rani)')).toBe(false);
    expect(sameAnimal('Cow #07 (Chandi)', 'Cow #07 (Bholi)')).toBe(false);
    expect(sameAnimal('Wachi #01 (Noori)', 'Cow #01')).toBe(false);
  });
  it('never matches empty tags, and one-word tags only match exactly', () => {
    expect(sameAnimal('', 'Cow #07')).toBe(false);
    expect(sameAnimal('Noori', 'Wachi #01 (Noori)')).toBe(false);
    expect(sameAnimal('Noori', 'noori')).toBe(true);
  });
});

describe('damOf', () => {
  it('reads the mother from the field or from the breed text', () => {
    expect(damOf({ damTag: 'Cow #07', breed: 'x' })).toBe('Cow #07');
    expect(damOf({ breed: 'HF Cross (Dam: Cow #07 Chandi)' })).toBe('Cow #07 Chandi');
    expect(damOf({ breed: 'Sahiwal' })).toBe('');
  });
});

const farm = () => ({
  milkersList: [{ id: 'm1', tag: 'Cow #07 (Chandi)', breed: 'HF', morningMilk: 10, eveningMilk: 9 }],
  wachiList: [
    { id: 'w1', tag: 'Wachi #01 (Noori)', breed: 'HF Cross (Dam: Cow #07 Chandi)', ageMonths: 16, weightKg: 270, stage: 'Ready for 1st AI' },
    { id: 'w2', tag: 'Wachi #09 (Pinky)', breed: 'x', damTag: 'Cow #07', ageMonths: 2, weightKg: 60, stage: 'Young Calf (< 6 Months)' },
    { id: 'w3', tag: 'Wachi #05 (Other)', breed: 'HF (Dam: Cow #14 Rani)', ageMonths: 5, weightKg: 100, stage: 'x' }
  ],
  breedingRecords: [
    { id: 'b1', cowTag: 'Cow #07 (Chandi)', aiDate: '2026-01-10', pregStatus: 'Calved', calves: [{ tag: 'Wachi #09 (Pinky)', date: '2026-10-20', weight: 30 }] },
    { id: 'b2', cowTag: 'Cow #07 (Chandi)', aiDate: '2026-08-15', pregStatus: 'Confirmed Pregnant' },
    { id: 'b3', cowTag: 'Cow #14 (Rani)', aiDate: '2026-10-27', pregStatus: 'Awaiting PD Check' }
  ],
  healthRecords: [
    { id: 'h1', target: 'Cow #07', type: 'Mastitis / Vet Treatment', dateGiven: '2026-05-01', disease: 'Mastitis' },
    { id: 'h2', target: 'Cow #07 (Chandi)', type: 'FMD Vaccine (Munh Khur)', dateGiven: '2026-09-15' },
    { id: 'h3', target: 'Whole Herd', type: 'Deworming (Drench / Bolus)', dateGiven: '2026-09-01' },
    { id: 'h4', target: 'Cow #14 (Rani)', type: 'FMD Vaccine (Munh Khur)', dateGiven: '2026-09-15' }
  ],
  cattleSales: []
});

describe('buildProfile', () => {
  it('collects AI history, treatments and calves for one animal only', () => {
    const p = buildProfile('Cow #07 (Chandi)', farm());
    expect(p.kind).toBe('milker');
    expect(p.ai.map((r) => r.id)).toEqual(['b2', 'b1']);                 // newest first
    expect(p.health.map((h) => h.id)).toEqual(['h2', 'h1']);             // herd-wide and other cows excluded
    expect(p.calves.map((c) => c.tag).sort()).toEqual(['Wachi #01 (Noori)', 'Wachi #09 (Pinky)']);
    expect(p.pregnancy.id).toBe('b2');
    expect(p.inHerd).toBe(true);
    expect(p.sold).toBe(false);
  });
  it('shows a calf with its mother and gives it its own profile', () => {
    const p = buildProfile('Wachi #01 (Noori)', farm());
    expect(p.kind).toBe('wachi');
    expect(p.dam).toBe('Cow #07 Chandi');
    expect(p.calves).toEqual([]);
  });
  it('marks a cow sold, and her calf sold with her', () => {
    const state = farm();
    state.cattleSales.push({ id: 's1', cowTag: 'Cow #07 (Chandi) (HF)', saleDate: '2026-11-01', salePrice: 300000, withCalves: [{ id: 'w2', tag: 'Wachi #09 (Pinky)' }] });
    state.wachiList = state.wachiList.filter((w) => w.id !== 'w2');
    const cow = buildProfile('Cow #07 (Chandi)', state);
    expect(cow.sold).toBe(true);
    expect(cow.sales[0].id).toBe('s1');
    const pinky = cow.calves.find((c) => c.tag === 'Wachi #09 (Pinky)');
    expect(pinky.sale.id).toBe('s1');
    const calf = buildProfile('Wachi #09 (Pinky)', state);
    expect(calf.sold).toBe(true);
    expect(calf.soldAsCalf).toBe(true);
    expect(calf.inHerd).toBe(false);
  });
  it('keeps the history of an animal that left the herd', () => {
    const state = farm();
    state.milkersList = [];
    state.cattleSales.push({ id: 's2', cowTag: 'Cow #14 (Rani)', saleDate: '2026-11-02', salePrice: 1, animal: { kind: 'milker' } });
    const p = buildProfile('Cow #14 (Rani)', state);
    expect(p.sold).toBe(true);
    expect(p.kind).toBe('milker');
    expect(p.ai).toHaveLength(1);
    expect(p.health).toHaveLength(1);
  });
});

describe('listAnimals', () => {
  it('lists each animal once, including ones only known from AI records', () => {
    const state = farm();
    const tags = listAnimals(state).map((a) => a.tag);
    expect(tags).toEqual(['Cow #07 (Chandi)', 'Wachi #01 (Noori)', 'Wachi #09 (Pinky)', 'Wachi #05 (Other)', 'Cow #14 (Rani)']);
  });
});

describe('goats and horses in profiles', () => {
  const state = () => ({
    milkersList: [], wachiList: [], breedingRecords: [],
    goats: [{ id: 'g1', tag: 'Goat #01 (Bholi)', species: 'Goat', sex: 'Female', count: 1, status: 'Milking' }, { id: 'g2', tag: 'Sheep flock A', species: 'Sheep', count: 12, status: 'In flock' }],
    horses: [{ id: 'hr1', name: 'Raja', breed: 'Nukra', status: 'Active' }],
    healthRecords: [{ id: 'h1', target: 'Raja', type: 'Deworming (Drench / Bolus)', dateGiven: '2026-10-01' }],
    cattleSales: []
  });
  it('builds profiles for goats and horses with their treatments', () => {
    const g = buildProfile('Goat #01 (Bholi)', state());
    expect(g.kind).toBe('goat');
    expect(g.inHerd).toBe(true);
    const h = buildProfile('Raja', state());
    expect(h.kind).toBe('horse');
    expect(h.health).toHaveLength(1);
  });
  it('lists them with the cattle', () => {
    expect(listAnimals(state()).map((a) => a.tag)).toEqual(['Goat #01 (Bholi)', 'Sheep flock A', 'Raja']);
  });
  it('treats a Sold or Died status as out of the herd, and a sale as sold', () => {
    const s = state();
    s.goats[0].status = 'Sold';
    expect(buildProfile('Goat #01 (Bholi)', s).sold).toBe(true);
    expect(buildProfile('Goat #01 (Bholi)', s).inHerd).toBe(false);
    s.horses[0].status = 'Died';
    expect(buildProfile('Raja', s).inHerd).toBe(false);
  });
});
