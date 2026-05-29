import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerListItem } from '../../../../../core/models/player.model';

import { HomeGridComponent } from './home-grid.component';

function basePlayer(id: string, overrides: Partial<PlayerListItem> = {}): PlayerListItem {
  return {
    id,
    apiFootballId: null,
    name: `Player ${id}`,
    team: 'T',
    league: 'L',
    position: null,
    imageUrl: null,
    rating: null,
    registeredAt: '2026-01-01',
    ...overrides,
  };
}

function withLinks(player: PlayerListItem, links: Record<string, unknown>): PlayerListItem {
  return Object.assign({}, player, { _links: links });
}

describe('HomeGridComponent', () => {
  let fixture: ComponentFixture<HomeGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HomeGridComponent] }).compileComponents();
    fixture = TestBed.createComponent(HomeGridComponent);
  });

  it('renders one fma-player-card per player', () => {
    fixture.componentRef.setInput('players', [basePlayer('1'), basePlayer('2')]);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('[data-testid=player-card]');
    expect(cards.length).toBe(2);
  });

  it('shows skeleton placeholders during initial load', () => {
    fixture.componentRef.setInput('players', []);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-grid-skeleton]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid=home-grid]')).toBeFalsy();
  });

  it('shows no-data empty state when not loading and players are empty', () => {
    fixture.componentRef.setInput('players', []);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('query', '');
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('[data-testid=home-grid-empty]');
    expect(empty?.getAttribute('data-kind')).toBe('no-data');
  });

  it('shows no-results empty state when filters are active', () => {
    fixture.componentRef.setInput('players', []);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('query', 'foo');
    fixture.componentRef.setInput('hasFilters', true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid=home-grid-empty]')?.getAttribute('data-kind'),
    ).toBe('no-results');
  });

  it('shows error empty state when error is set', () => {
    fixture.componentRef.setInput('players', []);
    fixture.componentRef.setInput('error', 'boom');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid=home-grid-empty]')?.getAttribute('data-kind'),
    ).toBe('error');
  });

  it('renders edit and delete buttons only when _links allow it', () => {
    const p1 = withLinks(basePlayer('1'), {
      update: { href: '/p/1', rel: 'update', method: 'PUT' },
      delete: { href: '/p/1', rel: 'delete', method: 'DELETE' },
    });
    const p2 = basePlayer('2');
    fixture.componentRef.setInput('players', [p1, p2]);
    fixture.detectChanges();

    const edits = fixture.nativeElement.querySelectorAll('[data-testid=player-card-edit-button]');
    const dels = fixture.nativeElement.querySelectorAll('[data-testid=player-card-delete-button]');
    expect(edits.length).toBe(1);
    expect(dels.length).toBe(1);
  });

  it('emits editRequested without bubbling click to playerSelected', () => {
    const p = withLinks(basePlayer('1'), {
      update: { href: '/p/1', rel: 'update', method: 'PUT' },
    });
    fixture.componentRef.setInput('players', [p]);
    fixture.detectChanges();

    const editSpy = jasmine.createSpy('edit');
    const selectSpy = jasmine.createSpy('select');
    fixture.componentInstance.editRequested.subscribe(editSpy);
    fixture.componentInstance.playerSelected.subscribe(selectSpy);

    const btn = fixture.nativeElement.querySelector('[data-testid=player-card-edit-button]') as HTMLElement;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editSpy).toHaveBeenCalled();
    expect(selectSpy).not.toHaveBeenCalled();
  });
});
