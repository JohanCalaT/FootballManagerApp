import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiFootballProfile } from '../../../../../core/models/api-football.model';
import { SelectionState } from '../../import-flow.store';

import { ImportPlayerCardComponent } from './import-player-card.component';

function profile(id: number, name = 'Lionel Messi'): ApiFootballProfile {
  return {
    apiFootballId: id,
    name,
    firstName: null,
    lastName: null,
    nationality: 'Argentina',
    birthDate: null,
    birthPlace: null,
    birthCountry: null,
    height: null,
    weight: null,
    shirtNumber: null,
    position: 'Attacker',
    photo: null,
  };
}

describe('ImportPlayerCardComponent', () => {
  let fixture: ComponentFixture<ImportPlayerCardComponent>;

  function setup(state?: SelectionState, disabled = false) {
    TestBed.configureTestingModule({ imports: [ImportPlayerCardComponent] });
    fixture = TestBed.createComponent(ImportPlayerCardComponent);
    fixture.componentRef.setInput('profile', profile(1));
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
  }

  it('renders idle state without check, badge or unavailable chip', () => {
    setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.is-checked')).toBeFalsy();
    expect(el.querySelector('.import-card__badge')).toBeFalsy();
  });

  it('renders pending state with hourglass label', () => {
    setup({ kind: 'pending' });
    const text: string = fixture.nativeElement.querySelector('[data-testid=import-player-season-badge-1]').textContent;
    expect(text).toContain('resolviendo');
  });

  it('renders resolved state with the season label', () => {
    setup({ kind: 'resolved', season: 2024 });
    const text: string = fixture.nativeElement.querySelector('[data-testid=import-player-season-badge-1]').textContent;
    expect(text).toContain('2024');
    expect(fixture.nativeElement.querySelector('.is-checked')).toBeTruthy();
  });

  it('renders unavailable state with red chip and disables the check', () => {
    setup({ kind: 'unavailable' });
    const text: string = fixture.nativeElement.querySelector('[data-testid=import-player-season-badge-1]').textContent;
    expect(text).toContain('Sin datos');
  });

  it('emits toggled with the apiFootballId when clicked', () => {
    setup();
    const spy = jasmine.createSpy();
    fixture.componentInstance.toggled.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=import-player-card-1]') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('does not emit when disabled and not selected', () => {
    setup(undefined, true);
    const spy = jasmine.createSpy();
    fixture.componentInstance.toggled.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=import-player-card-1]') as HTMLButtonElement).click();
    expect(spy).not.toHaveBeenCalled();
  });

  it('still allows toggle-off when disabled but already selected', () => {
    setup({ kind: 'resolved', season: 2024 }, true);
    const spy = jasmine.createSpy();
    fixture.componentInstance.toggled.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=import-player-card-1]') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledWith(1);
  });
});
