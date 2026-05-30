import {
  VALID_FORMATIONS,
  isValidFormation,
  FORMATIONS_JOINED,
} from '../../src/utils/idealTeamFormations';

describe('idealTeamFormations', () => {
  it('contains exactly 15 formations', () => {
    expect(VALID_FORMATIONS).toHaveLength(15);
  });

  it.each(['4-3-3', 'WM', '2-3-2-3', '4-2-4'])(
    'isValidFormation accepts %s',
    (f) => expect(isValidFormation(f)).toBe(true),
  );

  it.each(['9-9-9', '', ' 4-3-3 ', null, undefined, 123])(
    'isValidFormation rejects %p',
    (f) => expect(isValidFormation(f)).toBe(false),
  );

  it('FORMATIONS_JOINED is comma-separated with all formations', () => {
    expect(FORMATIONS_JOINED.split(', ')).toHaveLength(15);
    expect(FORMATIONS_JOINED).toContain('4-3-3');
    expect(FORMATIONS_JOINED).toContain('WM');
  });
});
