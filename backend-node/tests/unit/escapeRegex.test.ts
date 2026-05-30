import { escapeRegex } from '../../src/utils/escapeRegex';

describe('escapeRegex', () => {
  it('returns the same string when no metacharacters', () => {
    expect(escapeRegex('Messi')).toBe('Messi');
    expect(escapeRegex('FC Barcelona')).toBe('FC Barcelona');
  });

  it.each([
    ['.',  '\\.'],
    ['*',  '\\*'],
    ['+',  '\\+'],
    ['?',  '\\?'],
    ['^',  '\\^'],
    ['$',  '\\$'],
    ['{',  '\\{'],
    ['}',  '\\}'],
    ['(',  '\\('],
    [')',  '\\)'],
    ['|',  '\\|'],
    ['[',  '\\['],
    [']',  '\\]'],
    ['\\', '\\\\'],
  ])('escapes %s', (input, expected) => {
    expect(escapeRegex(input)).toBe(expected);
  });

  it('escapes within a real-world name', () => {
    expect(escapeRegex("O'Connor")).toBe("O'Connor");           // apóstrofo no es meta
    expect(escapeRegex('S.A.')).toBe('S\\.A\\.');
    expect(escapeRegex('100% real')).toBe('100% real');         // % no es meta en regex
    expect(escapeRegex('foo (bar)')).toBe('foo \\(bar\\)');
  });

  it('produces a regex that matches the original substring', () => {
    const tricky = 'name.with.dots';
    const re = new RegExp(escapeRegex(tricky), 'i');
    expect(re.test('Lionel name.with.dots Messi')).toBe(true);
    expect(re.test('namexwithxdots')).toBe(false); // los puntos ya no son wildcards
  });
});
