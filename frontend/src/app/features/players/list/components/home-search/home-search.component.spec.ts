import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';

import { HomeSearchComponent } from './home-search.component';

describe('HomeSearchComponent', () => {
  let fixture: ComponentFixture<HomeSearchComponent>;

  function setup(initialQ: string | null = null) {
    TestBed.configureTestingModule({
      imports: [HomeSearchComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(initialQ ? { q: initialQ } : {}) } },
        },
      ],
    });
    fixture = TestBed.createComponent(HomeSearchComponent);
    fixture.componentRef.setInput('debounceMs', 50);
  }

  function type(value: string) {
    const input = fixture.nativeElement.querySelector('[data-testid=home-search-input]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('emits the trimmed value after the debounce window', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.queryChange.subscribe((v) => emitted.push(v));

    type('  messi  ');
    tick(60);
    expect(emitted).toEqual(['messi']);
  }));

  it('coalesces rapid keystrokes into a single emission', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.queryChange.subscribe((v) => emitted.push(v));

    type('m');
    tick(10);
    type('me');
    tick(10);
    type('mes');
    tick(60);
    expect(emitted).toEqual(['mes']);
  }));

  it('seeds the input from ?q= query param', fakeAsync(() => {
    setup('ronaldo');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[data-testid=home-search-input]') as HTMLInputElement;
    expect(input.value).toBe('ronaldo');
    tick(60);
  }));

  it('clear button empties the input and emits empty string', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.queryChange.subscribe((v) => emitted.push(v));

    type('abc');
    tick(60);
    (fixture.nativeElement.querySelector('[data-testid=home-search-clear]') as HTMLElement).click();
    fixture.detectChanges();
    tick(60);
    expect(emitted).toEqual(['abc', '']);
  }));

  it('emits filtersRequested when the Filtros button is clicked', () => {
    setup();
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    fixture.componentInstance.filtersRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=home-filters-button]') as HTMLElement).click();
    expect(spy).toHaveBeenCalled();
  });

  it('renders a chip per active filter and emits filterRemoved on click', () => {
    setup();
    fixture.componentRef.setInput('filters', { team: 'Barça', from: '2024-01-01' });
    fixture.componentRef.setInput('filterCount', 2);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid=chip-team]')).toBeTruthy();
    expect(el.querySelector('[data-testid=chip-alta]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-filters-badge]')?.textContent?.trim()).toBe('2');

    const removed: string[] = [];
    fixture.componentInstance.filterRemoved.subscribe((k) => removed.push(k));
    (el.querySelector('[data-testid=chip-team]') as HTMLElement).click();
    expect(removed).toEqual(['team']);
  });

  it('updates the URL ?q= on each emission', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate').and.callThrough();
    type('messi');
    tick(60);
    expect(spy).toHaveBeenCalled();
    const call = spy.calls.mostRecent();
    expect(call.args[1]?.queryParams).toEqual({ q: 'messi' });
  }));
});
