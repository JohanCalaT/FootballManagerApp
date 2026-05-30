import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportSearchBarComponent } from './import-search-bar.component';

describe('ImportSearchBarComponent', () => {
  let fixture: ComponentFixture<ImportSearchBarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImportSearchBarComponent] });
    fixture = TestBed.createComponent(ImportSearchBarComponent);
    fixture.detectChanges();
  });

  function type(value: string) {
    const input = fixture.nativeElement.querySelector('[data-testid=import-search-input]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function captureEmissions(): string[] {
    const emitted: string[] = [];
    fixture.componentInstance.queryChange.subscribe((v) => emitted.push(v));
    return emitted;
  }

  it('does NOT emit while the user is typing', () => {
    const emitted = captureEmissions();
    type('me');
    type('mes');
    type('messi');
    expect(emitted).toEqual([]);
  });

  it('emits the trimmed value when the form is submitted (Enter or lupa)', () => {
    const emitted = captureEmissions();
    type('  messi  ');
    (fixture.nativeElement.querySelector('[data-testid=import-search]') as HTMLFormElement).requestSubmit();
    expect(emitted).toEqual(['messi']);
  });

  it('emits when the search submit button is clicked', () => {
    const emitted = captureEmissions();
    type('ronaldo');
    (fixture.nativeElement.querySelector('[data-testid=import-search-submit]') as HTMLElement).click();
    expect(emitted).toEqual(['ronaldo']);
  });

  it('does NOT emit on submit when the input is blank', () => {
    const emitted = captureEmissions();
    type('   ');
    (fixture.nativeElement.querySelector('[data-testid=import-search]') as HTMLFormElement).requestSubmit();
    expect(emitted).toEqual([]);
  });

  it('clear button empties the input and emits an empty string', () => {
    const emitted = captureEmissions();
    type('messi');
    (fixture.nativeElement.querySelector('[data-testid=import-search]') as HTMLFormElement).requestSubmit();
    (fixture.nativeElement.querySelector('[data-testid=import-search-clear]') as HTMLElement).click();
    expect(emitted).toEqual(['messi', '']);
  });
});
