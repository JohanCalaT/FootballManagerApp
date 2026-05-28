import { FormControl } from '@angular/forms';

import { PLAYER_POSITIONS, positionValidator } from './position.validator';

describe('positionValidator', () => {
  const validator = positionValidator();

  for (const valid of PLAYER_POSITIONS) {
    it(`accepts canonical value "${valid}"`, () => {
      expect(validator(new FormControl(valid))).toBeNull();
    });
  }

  it('passes when the control is empty (delegates required to Validators.required)', () => {
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('rejects an arbitrary string', () => {
    const result = validator(new FormControl('Striker'));
    expect(result).toEqual({
      invalidPosition: { allowed: PLAYER_POSITIONS, actual: 'Striker' },
    });
  });

  it('rejects case mismatches (enum is case-sensitive)', () => {
    expect(validator(new FormControl('goalkeeper'))).not.toBeNull();
  });
});
