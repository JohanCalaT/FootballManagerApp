import { TestBed } from '@angular/core/testing';

import { PlayersApi } from '../../../core/api/players.api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  ApiFootballProfile,
  ImportResult,
} from '../../../core/models/api-football.model';

import {
  ImportFlowStore,
  MAX_PLAYERS_PER_BATCH,
  resolveDefaultSeason,
} from './import-flow.store';

function profile(id: number, name = `P-${id}`): ApiFootballProfile {
  return {
    apiFootballId: id,
    name,
    firstName: null,
    lastName: null,
    nationality: null,
    birthDate: null,
    birthPlace: null,
    birthCountry: null,
    height: null,
    weight: null,
    shirtNumber: null,
    position: null,
    photo: null,
  };
}

function ok<T>(data: T, status = 200, message = 'OK'): ApiResponse<T> {
  return { status, message, data, _links: {} };
}

describe('resolveDefaultSeason', () => {
  it('returns the most recent overlap with the free-plan window', () => {
    expect(resolveDefaultSeason([2020, 2022, 2023, 2024])).toBe(2024);
    expect(resolveDefaultSeason([2022, 2023])).toBe(2023);
    expect(resolveDefaultSeason([2024])).toBe(2024);
  });

  it('returns null when there is no overlap', () => {
    expect(resolveDefaultSeason([])).toBeNull();
    expect(resolveDefaultSeason([2019, 2020, 2021])).toBeNull();
    expect(resolveDefaultSeason([2025])).toBeNull();
  });
});

describe('ImportFlowStore', () => {
  let store: ImportFlowStore;
  let api: jasmine.SpyObj<PlayersApi>;

  beforeEach(() => {
    api = jasmine.createSpyObj<PlayersApi>('PlayersApi', [
      'searchExternalOnce',
      'seasonsOfOnce',
      'import',
    ]);
    TestBed.configureTestingModule({
      providers: [ImportFlowStore, { provide: PlayersApi, useValue: api }],
    });
    store = TestBed.inject(ImportFlowStore);
  });

  it('search populates results and clears them on empty query', async () => {
    api.searchExternalOnce.and.resolveTo(ok([profile(1), profile(2)]));
    await store.search('messi');
    expect(store.searchResults().length).toBe(2);

    await store.search('   ');
    expect(store.searchResults()).toEqual([]);
    expect(api.searchExternalOnce).toHaveBeenCalledTimes(1);
  });

  it('search captures the error message and resets results', async () => {
    api.searchExternalOnce.and.rejectWith(new Error('boom'));
    await store.search('x');
    expect(store.searchError()).toBe('boom');
    expect(store.searchResults()).toEqual([]);
  });

  it('toggle resolves the most recent free-plan season for the player', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2022, 2023, 2024]));
    await store.toggle(10);
    expect(store.stateOf(10)).toEqual({ kind: 'resolved', season: 2024 });
    expect(store.selectedCount()).toBe(1);
  });

  it('toggle marks the player unavailable when no overlap exists', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2019, 2020]));
    await store.toggle(11);
    expect(store.stateOf(11)).toEqual({ kind: 'unavailable' });
    expect(store.selectedCount()).toBe(0);
  });

  it('toggle removes the player when already selected', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2024]));
    await store.toggle(12);
    expect(store.isSelected(12)).toBeTrue();
    await store.toggle(12);
    expect(store.isSelected(12)).toBeFalse();
  });

  it('caches seasons so reselecting does not refetch', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2024]));
    await store.toggle(20);
    await store.toggle(20);
    await store.toggle(20);
    expect(api.seasonsOfOnce).toHaveBeenCalledTimes(1);
  });

  it('blocks selection past MAX_PLAYERS_PER_BATCH', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2024]));
    for (let i = 0; i < MAX_PLAYERS_PER_BATCH; i += 1) {
      await store.toggle(i);
    }
    expect(store.atCap()).toBeTrue();
    await store.toggle(99);
    expect(store.isSelected(99)).toBeFalse();
  });

  it('submit classifies status 201 as success', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2024]));
    await store.toggle(1);
    const payload: ImportResult = { imported: [{ id: 'x' } as never], failed: [] };
    api.import.and.resolveTo(ok(payload, 201, 'Created'));

    await store.submit();

    expect(store.submitState()).toBe('success');
    expect(store.result()).toEqual(payload);
  });

  it('submit classifies status 207 as partial', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2024]));
    await store.toggle(1);
    const payload: ImportResult = {
      imported: [{ id: 'x' } as never],
      failed: [{ apiFootballId: 2, season: 2024, reason: 'dup' }],
    };
    api.import.and.resolveTo(ok(payload, 207));

    await store.submit();
    expect(store.submitState()).toBe('partial');
  });

  it('submit classifies 4xx/5xx as error and stores the message', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2024]));
    await store.toggle(1);
    api.import.and.resolveTo(ok({ imported: [], failed: [] }, 503, 'Daily quota exceeded'));

    await store.submit();
    expect(store.submitState()).toBe('error');
    expect(store.submitError()).toBe('Daily quota exceeded');
  });

  it('submit only sends resolved selections, skipping unavailable ones', async () => {
    api.seasonsOfOnce.withArgs(1).and.resolveTo(ok([2024]));
    api.seasonsOfOnce.withArgs(2).and.resolveTo(ok([2019]));
    await store.toggle(1);
    await store.toggle(2);
    api.import.and.resolveTo(ok({ imported: [], failed: [] }, 201));

    await store.submit();

    expect(api.import).toHaveBeenCalledOnceWith([{ apiFootballId: 1, season: 2024 }]);
  });

  it('clearAll wipes selections', async () => {
    api.seasonsOfOnce.and.resolveTo(ok([2024]));
    await store.toggle(1);
    await store.toggle(2);
    store.clearAll();
    expect(store.selectedCount()).toBe(0);
    expect(store.selections().size).toBe(0);
  });
});
