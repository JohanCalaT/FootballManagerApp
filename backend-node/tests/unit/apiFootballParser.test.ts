import {
  cleanLabel, parseBirthDate, parseRating,
} from '../../src/utils/apiFootballParser';

describe('apiFootballParser', () => {
  describe('cleanLabel', () => {
    it('returns trimmed string when non-empty', () => {
      expect(cleanLabel('  170 cm  ')).toBe('170 cm');
      expect(cleanLabel('67 kg')).toBe('67 kg');
    });
    it.each([null, undefined, '', '   '])(
      'returns undefined for %p',
      (raw) => expect(cleanLabel(raw as string | null | undefined)).toBeUndefined(),
    );
  });

  describe('parseRating', () => {
    it('parses string with 6 decimals and rounds to 2', () => {
      expect(parseRating('8.103125')).toBe(8.10);
      expect(parseRating('6.999')).toBe(7.00);
    });
    it('accepts number input', () => {
      expect(parseRating(7.5)).toBe(7.50);
    });
    it.each([null, undefined, '', 'abc', NaN])(
      'returns undefined for %p',
      (raw) => expect(parseRating(raw as string | number | null | undefined)).toBeUndefined(),
    );
  });

  describe('parseBirthDate', () => {
    it('parses YYYY-MM-DD to UTC Date', () => {
      const d = parseBirthDate('1987-06-24');
      expect(d).toBeInstanceOf(Date);
      expect(d?.toISOString()).toBe('1987-06-24T00:00:00.000Z');
    });
    it.each([
      'not-a-date',
      '24-06-1987',     // formato distinto
      '1987/06/24',     // separador distinto
      '',
      null,
      undefined,
    ])('returns undefined for %p', (raw) => {
      expect(parseBirthDate(raw as string | null | undefined)).toBeUndefined();
    });
  });
});
