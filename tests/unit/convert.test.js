import { describe, expect, it } from 'vitest';
import { milkerToWachi, wachiToMilker } from '../../src/lib/convert.js';

const mark = { symbol: '🐄', color: 'red' };
describe('moving an animal between lists', () => {
  it('heifer to milker keeps her details', () => {
    const st = { wachiList: [{ id: 'w1', tag: 'Lali', species: 'Cow', breed: 'Sahiwal', ageMonths: 30, weightKg: 300, mark, damTag: 'Mum', notes: 'n' }], milkersList: [] };
    const m = wachiToMilker(st, 'w1');
    expect(st.wachiList).toHaveLength(0);
    expect(st.milkersList[0]).toMatchObject({ tag: 'Lali', species: 'Cow', breed: 'Sahiwal', mark, damTag: 'Mum', notes: 'n', morningMilk: 0 });
    expect(m.id).toBe(st.milkersList[0].id);
  });
  it('milker to heifer keeps her details', () => {
    const st = { milkersList: [{ id: 'm1', tag: 'Gulabo', species: 'Buffalo', breed: 'Murrah', mark }], wachiList: [] };
    milkerToWachi(st, 'm1');
    expect(st.milkersList).toHaveLength(0);
    expect(st.wachiList[0]).toMatchObject({ tag: 'Gulabo', species: 'Buffalo', breed: 'Murrah', mark, ageMonths: 0 });
  });
  it('unknown id changes nothing', () => {
    const st = { milkersList: [], wachiList: [] };
    expect(wachiToMilker(st, 'x')).toBeNull();
    expect(milkerToWachi(st, 'x')).toBeNull();
  });
});
