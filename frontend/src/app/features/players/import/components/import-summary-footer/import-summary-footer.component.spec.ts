import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportSummaryFooterComponent } from './import-summary-footer.component';

describe('ImportSummaryFooterComponent', () => {
  let fixture: ComponentFixture<ImportSummaryFooterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImportSummaryFooterComponent] });
  });

  function setup(count: number, canSubmit = false, submitting = false) {
    fixture = TestBed.createComponent(ImportSummaryFooterComponent);
    fixture.componentRef.setInput('selectedCount', count);
    fixture.componentRef.setInput('canSubmit', canSubmit);
    fixture.componentRef.setInput('submitting', submitting);
    fixture.detectChanges();
  }

  it('renders pluralized counter', () => {
    setup(1);
    expect(fixture.nativeElement.querySelector('[data-testid=import-summary-counter]').textContent).toContain('1 jugador seleccionado');
    setup(3);
    expect(fixture.nativeElement.querySelector('[data-testid=import-summary-counter]').textContent).toContain('3 jugadores seleccionados');
  });

  it('keeps the submit button disabled when canSubmit is false', () => {
    setup(0, false);
    const btn = fixture.nativeElement.querySelector('[data-testid=import-submit-button]') as HTMLButtonElement;
    expect(btn.disabled).toBeTrue();
  });

  it('enables the submit button when canSubmit is true', () => {
    setup(2, true);
    const btn = fixture.nativeElement.querySelector('[data-testid=import-submit-button]') as HTMLButtonElement;
    expect(btn.disabled).toBeFalse();
  });

  it('shows the spinner label while submitting', () => {
    setup(2, false, true);
    expect(fixture.nativeElement.querySelector('[data-testid=import-submit-button]').textContent).toContain('Importando');
  });

  it('emits submitRequested on click', () => {
    setup(2, true);
    const spy = jasmine.createSpy();
    fixture.componentInstance.submitRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=import-submit-button]') as HTMLElement).click();
    expect(spy).toHaveBeenCalled();
  });

  it('shows clear link only when selection is non-empty and not submitting', () => {
    setup(0);
    expect(fixture.nativeElement.querySelector('[data-testid=import-summary-clear]')).toBeFalsy();
    setup(2);
    expect(fixture.nativeElement.querySelector('[data-testid=import-summary-clear]')).toBeTruthy();
    setup(2, false, true);
    expect(fixture.nativeElement.querySelector('[data-testid=import-summary-clear]')).toBeFalsy();
  });
});
