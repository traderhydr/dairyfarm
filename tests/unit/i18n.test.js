import { describe, expect, it } from 'vitest';
import ur from '../../src/i18n/ur.json';
import { translate } from '../../src/i18n/index.js';

describe('translate', () => {
  it('finds exact strings, ignoring extra whitespace', () => {
    expect(translate('Cashbook')).toBe(ur.Cashbook);
    expect(translate('  Add   entry ')).toBe(ur['Add entry']);
    expect(translate('Close ×')).toBe(ur['Close ×']);
  });
  it('translates strings that contain numbers', () => {
    expect(translate('12 Months')).toBe('12 مہینے');
    expect(translate('3 entries')).toBe('3 اندراجات');
    expect(translate('Pregnant: 6 months 12 days')).toBe('حاملہ: 6 مہینے 12 دن');
    expect(translate('3 months 18 days to calving')).toBe('بچھڑے میں 3 مہینے 18 دن باقی');
    expect(translate('12 days to calving')).toBe('بچھڑے میں 12 دن باقی');
    expect(translate('Since AI: 9 days')).toBe('اے آئی کے بعد: 9 دن');
    expect(translate('Overdue by 2 months 5 days')).toBe('تاخیر: 2 مہینے 5 دن');
    expect(translate('6 months 12 days (3 months 18 days left)')).toBe('6 مہینے 12 دن (3 مہینے 18 دن باقی)');
    expect(translate('12.5 L/day')).toBe('12.5 لیٹر روزانہ');
    expect(translate('+ Rs. 12,000 Profit')).toBeNull;   // amounts keep Rs.
  });
  it('translates each part of "a • b" strings and keeps data parts as they are', () => {
    expect(translate('Goat • Female • Zorro')).toBe(`${ur.Goat} • ${ur.Female} • Zorro`);
    expect(translate('Cost Rs. 109,500 · Income Rs. 336,000')).toBe('خرچ Rs. 109,500 · آمدنی Rs. 336,000');
    expect(translate('Seed · Akbar-19, 200 kg')).toBe(`${ur.Seed} · Akbar-19, 200 kg`);
  });
  it('keeps names and example text inside translated sentences', () => {
    expect(translate('Delete Cow #07 (Chandi)?')).toBe('Cow #07 (Chandi) حذف کریں؟');
    expect(translate('e.g. Cow #07 (Chandi)')).toBe('مثلاً Cow #07 (Chandi)');
    expect(translate('No matches for “raja”.')).toBe('“raja” کے لیے کوئی نتیجہ نہیں۔');
  });
  it('keeps the minus sign with the amount in right-to-left text', () => {
    expect(translate('- Rs. 17,300')).toBe('\u200e- Rs. 17,300');
    expect(translate('+ Rs. 14,500')).toBe('\u200e+ Rs. 14,500');
  });
  it('returns null for text it does not know (user data stays as typed)', () => {
    expect(translate('Zorro the Hamster')).toBeNull();
    expect(translate('Chaudhry Tariq')).toBeNull();
    expect(translate('')).toBeNull();
  });
  it('has a translation for every dictionary key and no empty values', () => {
    for (const [k, v] of Object.entries(ur)) {
      expect(typeof v === 'string' && v.length > 0, k).toBe(true);
    }
  });
});

describe('breeding protocol texts', () => {
  it('translates the due-time sentences and the step line', () => {
    expect(translate('due tomorrow at 8:00 AM')).toBe('کل 8:00 صبح بجے واجب');
    expect(translate('due in 25 min')).toBe('25 منٹ میں واجب');
    expect(translate('overdue by 4 h')).toBe('4 گھنٹے تاخیر');
    expect(translate('AI window 8:00 AM to 12:00 PM')).toBe('اے آئی کا وقت 8:00 صبح سے 12:00 شام تک');
    expect(translate('Step 2 of 4: PGF2α — due tomorrow at 8:00 AM')).toBe('مرحلہ 2 از 4: PGF2α — کل 8:00 صبح بجے واجب');
    expect(translate('Step 1 of 4: GnRH (1st injection) — due now')).toBe(`مرحلہ 1 از 4: ${ur['GnRH (1st injection)']} — ابھی واجب`);
  });
  it('translates date-times and result lines', () => {
    expect(translate('13 Nov, 8:00 AM')).toBe('13 Nov، 8:00 صبح');
    expect(translate('Done 13 Nov, 8:05 AM')).toBe('مکمل: 13 Nov، 8:05 صبح');
    expect(translate('Inseminated · 1 month 3 days')).toBe('اے آئی شدہ · 1 مہینے 3 دن');
    expect(translate('Cancel the Ovsynch protocol?')).toBe('Ovsynch پروٹوکول منسوخ کریں؟');
  });
});
