import { TestBed } from '@angular/core/testing';

import { PlayersApi } from '../../../core/api/players.api';
import { PagedResponse } from '../../../core/models/api-response.model';
import { PlayerListItem } from '../../../core/models/player.model';

import { PlayersPagedStore } from './players-paged.store';

function makePlayer(id: string, name: string): PlayerListItem {
  return {
    id,
    apiFootballId: null,
    name,
    team: 'Team',
    league: 'League',
    position: null,
    imageUrl: null,
    rating: null,
    registeredAt: '2026-01-01T00:00:00Z',
  };
}

function pagedResponse(players: PlayerListItem[], page: number, total: number): PagedResponse<PlayerListItem> {
  return {
    status: 200,
    message: 'ok',
    data: players,
    page,
    limit: 20,
    total,
    _links: {},
  };
}

describe('PlayersPagedStore', () => {
  let store: PlayersPagedStore;
  let api: jasmine.SpyObj<PlayersApi>;

  beforeEach(() => {
    api = jasmine.createSpyObj<PlayersApi>('PlayersApi', ['listPage', 'searchPage']);
    TestBed.configureTestingModule({
      providers: [PlayersPagedStore, { provide: PlayersApi, useValue: api }],
    });
    store = TestBed.inject(PlayersPagedStore);
  });

  it('loads page 1 via listPage when query is empty', async () => {
    api.listPage.and.resolveTo(pagedResponse([makePlayer('1', 'Messi')], 1, 1));
    await store.reload('');
    expect(api.listPage).toHaveBeenCalledOnceWith(1, 20);
    expect(store.players().length).toBe(1);
    expect(store.total()).toBe(1);
    expect(store.allLoaded()).toBeTrue();
  });

  it('loads page 1 via searchPage when query is set', async () => {
    api.searchPage.and.resolveTo(pagedResponse([makePlayer('1', 'Messi')], 1, 1));
    await store.reload('mes');
    expect(api.searchPage).toHaveBeenCalledOnceWith('mes', 1, 20);
  });

  it('appends results from subsequent loadMore calls', async () => {
    api.listPage.and.callFake((page: number) =>
      Promise.resolve(
        pagedResponse(
          [makePlayer(String(page), `P${page}`)],
          page,
          3,
        ),
      ),
    );

    await store.reload('');
    await store.loadMore();
    await store.loadMore();

    expect(store.players().map((p) => p.id)).toEqual(['1', '2', '3']);
    expect(store.page()).toBe(3);
    expect(store.allLoaded()).toBeTrue();
  });

  it('no-ops loadMore when all items are loaded', async () => {
    api.listPage.and.resolveTo(pagedResponse([makePlayer('1', 'A')], 1, 1));
    await store.reload('');
    await store.loadMore();
    expect(api.listPage).toHaveBeenCalledTimes(1);
  });

  it('captures the error message and stops loading on failure', async () => {
    api.listPage.and.rejectWith(new Error('boom'));
    await store.reload('');
    expect(store.error()).toBe('boom');
    expect(store.loading()).toBeFalse();
    expect(store.players()).toEqual([]);
  });

  it('clears previous state when reload runs again', async () => {
    api.listPage.and.resolveTo(pagedResponse([makePlayer('1', 'A')], 1, 5));
    await store.reload('');
    api.searchPage.and.resolveTo(pagedResponse([makePlayer('9', 'Z')], 1, 1));
    await store.reload('z');
    expect(store.players().map((p) => p.id)).toEqual(['9']);
    expect(store.total()).toBe(1);
  });
});
