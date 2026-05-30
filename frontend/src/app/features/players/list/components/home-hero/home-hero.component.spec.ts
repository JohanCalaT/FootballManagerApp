import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeHeroComponent } from './home-hero.component';

describe('HomeHeroComponent', () => {
  let fixture: ComponentFixture<HomeHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HomeHeroComponent] }).compileComponents();
    fixture = TestBed.createComponent(HomeHeroComponent);
  });

  it('renders the placeholder subtitle when count is null', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('[data-testid=home-hero-count]').textContent;
    expect(text).toContain('Descubre');
  });

  it('renders singular wording for count 1', () => {
    fixture.componentRef.setInput('count', 1);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.querySelector('[data-testid=home-hero-count]').textContent;
    expect(text).toContain('1 jugador ');
  });

  it('renders plural wording for larger counts', () => {
    fixture.componentRef.setInput('count', 1234);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.querySelector('[data-testid=home-hero-count]').textContent;
    expect(text).toMatch(/1[.,]?234/);
    expect(text).toContain('jugadores');
  });

  it('renders empty-state copy when count is 0', () => {
    fixture.componentRef.setInput('count', 0);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.querySelector('[data-testid=home-hero-count]').textContent;
    expect(text).toContain('Aún no hay jugadores');
  });
});
