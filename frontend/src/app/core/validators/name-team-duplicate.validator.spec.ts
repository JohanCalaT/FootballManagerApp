import { FormControl, FormGroup } from '@angular/forms';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { nameTeamDuplicateValidator } from './name-team-duplicate.validator';

describe('nameTeamDuplicateValidator', () => {
  function makeGroup(name: string, team: string): FormGroup {
    return new FormGroup({
      name: new FormControl(name),
      team: new FormControl(team),
    });
  }

  function runAsync(result: ReturnType<ReturnType<typeof nameTeamDuplicateValidator>>):
    | Promise<unknown>
    | unknown {
    if (result instanceof Observable) return firstValueFrom(result);
    return Promise.resolve(result);
  }

  it('returns null without calling lookup when either field is empty', async () => {
    const lookup = jasmine.createSpy('lookup').and.returnValue(of(true));
    const validator = nameTeamDuplicateValidator(lookup, { debounceMs: 0 });

    expect(await runAsync(validator(makeGroup('', 'X')))).toBeNull();
    expect(await runAsync(validator(makeGroup('Y', '')))).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('returns nameTeamDuplicate error when the lookup reports the pair exists', async () => {
    const lookup = jasmine
      .createSpy('lookup')
      .and.returnValue(of(true));
    const validator = nameTeamDuplicateValidator(lookup, { debounceMs: 0 });

    const result = await runAsync(validator(makeGroup('Messi', 'Inter Miami')));

    expect(lookup).toHaveBeenCalledOnceWith('Messi', 'Inter Miami');
    expect(result).toEqual({ nameTeamDuplicate: { name: 'Messi', team: 'Inter Miami' } });
  });

  it('returns null when the lookup reports no duplicate', async () => {
    const lookup = jasmine.createSpy('lookup').and.returnValue(of(false));
    const validator = nameTeamDuplicateValidator(lookup, { debounceMs: 0 });

    const result = await runAsync(validator(makeGroup('Unknown', 'Local CF')));
    expect(result).toBeNull();
  });

  it('trims whitespace from both fields before calling lookup', async () => {
    const lookup = jasmine.createSpy('lookup').and.returnValue(of(false));
    const validator = nameTeamDuplicateValidator(lookup, { debounceMs: 0 });

    await runAsync(validator(makeGroup('  Messi  ', '  Inter Miami  ')));

    expect(lookup).toHaveBeenCalledOnceWith('Messi', 'Inter Miami');
  });

  it('swallows lookup errors so a flaky backend does not block submission', async () => {
    const lookup = jasmine
      .createSpy('lookup')
      .and.returnValue(throwError(() => new Error('boom')));
    const validator = nameTeamDuplicateValidator(lookup, { debounceMs: 0 });

    const result = await runAsync(validator(makeGroup('X', 'Y')));
    expect(result).toBeNull();
  });
});
