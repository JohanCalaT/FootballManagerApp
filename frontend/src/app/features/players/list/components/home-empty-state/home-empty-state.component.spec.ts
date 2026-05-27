import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeEmptyStateComponent } from './home-empty-state.component';

describe('HomeEmptyStateComponent', () => {
  let fixture: ComponentFixture<HomeEmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HomeEmptyStateComponent] }).compileComponents();
    fixture = TestBed.createComponent(HomeEmptyStateComponent);
  });

  it('renders the no-results title with the query', () => {
    fixture.componentRef.setInput('kind', 'no-results');
    fixture.componentRef.setInput('query', 'messi');
    fixture.detectChanges();
    const text: string = fixture.nativeElement.querySelector('[data-testid=home-grid-empty]').textContent;
    expect(text).toContain('Sin resultados');
    expect(text).toContain('messi');
  });

  it('renders the register CTA only when no-data and canRegister', () => {
    fixture.componentRef.setInput('kind', 'no-data');
    fixture.componentRef.setInput('canRegister', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-empty-cta-register]')).toBeFalsy();

    fixture.componentRef.setInput('canRegister', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-empty-cta-register]')).toBeTruthy();
  });

  it('renders the retry CTA when error', () => {
    fixture.componentRef.setInput('kind', 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-empty-retry]')).toBeTruthy();
  });

  it('emits retry when the retry button is clicked', () => {
    fixture.componentRef.setInput('kind', 'error');
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    fixture.componentInstance.retryRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=home-empty-retry]') as HTMLElement).click();
    expect(spy).toHaveBeenCalled();
  });
});
