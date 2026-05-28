import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CollapsibleSectionComponent } from './collapsible-section.component';

@Component({
  standalone: true,
  imports: [CollapsibleSectionComponent],
  template: `
    <app-collapsible-section
      [title]="title"
      [(open)]="isOpen"
      (toggled)="onToggle($event)">
      <p data-testid="inner">Inner content</p>
    </app-collapsible-section>
  `,
})
class HostComponent {
  title = 'Más datos';
  isOpen = false;
  toggles: boolean[] = [];
  onToggle(open: boolean): void {
    this.toggles.push(open);
  }
}

describe('CollapsibleSectionComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function clickToggle(): void {
    fixture.debugElement
      .query(By.css('[data-testid="collapsible-toggle"]'))
      .triggerEventHandler('click');
    fixture.detectChanges();
  }

  it('renders the title and starts collapsed by default', () => {
    const title = fixture.debugElement.query(By.css('.collapsible__title'));
    const content = fixture.debugElement.query(By.css('[data-testid="collapsible-content"]'));

    expect(title.nativeElement.textContent.trim()).toBe('Más datos');
    expect(content.nativeElement.hidden).toBeTrue();
  });

  it('opens and closes on header click and emits the new state', () => {
    clickToggle();
    expect(host.isOpen).toBeTrue();
    expect(host.toggles).toEqual([true]);

    clickToggle();
    expect(host.isOpen).toBeFalse();
    expect(host.toggles).toEqual([true, false]);
  });

  it('reflects external open changes via the two-way binding', () => {
    host.isOpen = true;
    fixture.detectChanges();

    const content = fixture.debugElement.query(By.css('[data-testid="collapsible-content"]'));
    expect(content.nativeElement.hidden).toBeFalse();
  });

  it('reflects aria-expanded for accessibility', () => {
    const toggle = fixture.debugElement.query(By.css('[data-testid="collapsible-toggle"]'));
    expect(toggle.nativeElement.getAttribute('aria-expanded')).toBe('false');

    clickToggle();
    expect(toggle.nativeElement.getAttribute('aria-expanded')).toBe('true');
  });
});
