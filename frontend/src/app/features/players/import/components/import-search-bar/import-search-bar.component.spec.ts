import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ImportSearchBarComponent } from './import-search-bar.component';

describe('ImportSearchBarComponent', () => {
  let fixture: ComponentFixture<ImportSearchBarComponent>;

  function setup() {
    TestBed.configureTestingModule({ imports: [ImportSearchBarComponent] });
    fixture = TestBed.createComponent(ImportSearchBarComponent);
    fixture.componentRef.setInput('debounceMs', 50);
  }

  function type(value: string) {
    const input = fixture.nativeElement.querySelector('[data-testid=import-search-input]') as HTMLInputElement;
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

  it('clear button empties the input and emits empty string', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.queryChange.subscribe((v) => emitted.push(v));

    type('abc');
    tick(60);
    (fixture.nativeElement.querySelector('[data-testid=import-search-clear]') as HTMLElement).click();
    fixture.detectChanges();
    tick(60);
    expect(emitted).toEqual(['abc', '']);
  }));
});
