import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { PlayerPosition } from '../models/player.model';

export const PLAYER_POSITIONS: readonly PlayerPosition[] = [
  'Goalkeeper',
  'Defender',
  'Midfielder',
  'Attacker',
] as const;

/**
 * Reactive Forms validator that restricts the value to the canonical
 * `PlayerPosition` enum. Used by the manual create form, where the field is
 * presented as a 4-option segmented control — but a validator is still
 * required because the form value can be patched programmatically.
 *
 * Empty values pass through; combine with `Validators.required` when the
 * field is mandatory at the form level.
 */
export function positionValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    return (PLAYER_POSITIONS as readonly string[]).includes(value)
      ? null
      : { invalidPosition: { allowed: PLAYER_POSITIONS, actual: value } };
  };
}
