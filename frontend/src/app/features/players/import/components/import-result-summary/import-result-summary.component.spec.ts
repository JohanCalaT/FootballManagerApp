import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportResult } from '../../../../../core/models/api-football.model';
import { Player } from '../../../../../core/models/player.model';

import { ImportResultSummaryComponent } from './import-result-summary.component';

const player: Player = {
  id: 'p1',
  apiFootballId: 1,
  name: 'Messi',
  firstName: null, lastName: null, nationality: null,
  birthDate: null, birthPlace: null, birthCountry: null,
  height: null, weight: null, position: null, shirtNumber: null,
  injured: false, imageUrl: null, imageSource: null,
  team: 'Inter Miami', league: 'MLS',
  registeredAt: '2026-01-01', createdByUserId: 'u',
  clientGeolocation: null, playerGeolocation: null,
  statistics: [],
};

describe('ImportResultSummaryComponent', () => {
  let fixture: ComponentFixture<ImportResultSummaryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImportResultSummaryComponent] });
  });

  function setup(result: ImportResult, error: string | null = null) {
    fixture = TestBed.createComponent(ImportResultSummaryComponent);
    fixture.componentRef.setInput('result', result);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
  }

  it('renders imported section when there are successes', () => {
    setup({ imported: [player], failed: [] });
    expect(fixture.nativeElement.querySelector('[data-testid=import-result-imported]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid=import-result-failed]')).toBeFalsy();
  });

  it('renders failed section when there are failures', () => {
    setup({ imported: [], failed: [{ apiFootballId: 9, season: 2024, reason: 'dup' }] });
    expect(fixture.nativeElement.querySelector('[data-testid=import-result-imported]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[data-testid=import-result-failed]')).toBeTruthy();
  });

  it('renders both sections when result is mixed', () => {
    setup({ imported: [player], failed: [{ apiFootballId: 9, season: 2024, reason: 'dup' }] });
    expect(fixture.nativeElement.querySelector('[data-testid=import-result-imported]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid=import-result-failed]')).toBeTruthy();
  });

  it('renders the error banner when error is set', () => {
    setup({ imported: [], failed: [] }, 'Daily quota exceeded');
    const banner = fixture.nativeElement.querySelector('[data-testid=import-error-banner]');
    expect(banner?.textContent).toContain('Daily quota exceeded');
  });

  it('emits closeRequested when back button is clicked', () => {
    setup({ imported: [player], failed: [] });
    const spy = jasmine.createSpy();
    fixture.componentInstance.closeRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=import-result-back-button]') as HTMLElement).click();
    expect(spy).toHaveBeenCalled();
  });
});
