import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';

export type DuplicateLookup = (name: string, team: string) => Observable<boolean>;

export interface NameTeamDuplicateOptions {
  /** Debounce window before issuing the lookup. Defaults to 400ms. */
  readonly debounceMs?: number;
  /** Form control names for name and team. Defaults to `name` and `team`. */
  readonly nameKey?: string;
  readonly teamKey?: string;
}

/**
 * Form-group level async validator that warns about a `Name + Team` pair
 * already present in the database (soft-uniqueness rule from CLAUDE.md).
 *
 * It is a *form-level* validator (not a control-level one) because the
 * duplicate condition depends on TWO fields. Attach it to the FormGroup,
 * not to the individual controls. The resulting error key is
 * `nameTeamDuplicate` so the create form can surface it inline next to the
 * Team field without polluting either control's own error map.
 *
 * The lookup is injected as a function so the validator stays decoupled
 * from `PlayersApi` and trivially testable with a fake.
 */
export function nameTeamDuplicateValidator(
  lookup: DuplicateLookup,
  opts: NameTeamDuplicateOptions = {},
): AsyncValidatorFn {
  const debounceMs = opts.debounceMs ?? 400;
  const nameKey = opts.nameKey ?? 'name';
  const teamKey = opts.teamKey ?? 'team';

  return (group: AbstractControl): Observable<ValidationErrors | null> => {
    const name = (group.get(nameKey)?.value ?? '').toString().trim();
    const team = (group.get(teamKey)?.value ?? '').toString().trim();
    if (!name || !team) return of(null);

    return timer(debounceMs).pipe(
      switchMap(() =>
        lookup(name, team).pipe(
          map((exists) => (exists ? { nameTeamDuplicate: { name, team } } : null)),
          // Network errors must NOT block submission — fall back to "no error"
          // and let the backend be the source of truth via a 409 response.
          catchError(() => of(null)),
        ),
      ),
    );
  };
}
