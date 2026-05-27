import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_URL } from '../tokens/gateway-url.token';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import {
  CreatePlayerRequest,
  ImportPlayerItem,
  Player,
  PlayerSearchFilters,
  UpdatePlayerRequest,
} from '../models/player.model';

@Injectable({ providedIn: 'root' })
export class PlayersApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(GATEWAY_URL);

  list(page: Signal<number>, limit: Signal<number>) {
    return httpResource<PagedResponse<Player>>(
      () => `${this.base}/api/players?page=${page()}&limit=${limit()}`,
    );
  }

  byId(id: Signal<string | null>) {
    return httpResource<ApiResponse<Player>>(() => {
      const value = id();
      return value ? `${this.base}/api/players/${value}` : undefined;
    });
  }

  search(filters: Signal<PlayerSearchFilters>) {
    return httpResource<PagedResponse<Player>>(() => {
      const f = filters();
      const params = new URLSearchParams();
      if (f.name) params.set('name', f.name);
      if (f.team) params.set('team', f.team);
      if (f.league) params.set('league', f.league);
      if (f.from) params.set('from', f.from);
      if (f.to) params.set('to', f.to);
      if (f.page != null) params.set('page', String(f.page));
      if (f.limit != null) params.set('limit', String(f.limit));
      return `${this.base}/api/players/search?${params.toString()}`;
    });
  }

  searchExternal(query: Signal<string | null>) {
    return httpResource<ApiResponse<Player[]>>(() => {
      const q = query();
      return q ? `${this.base}/api/players/search-external?search=${encodeURIComponent(q)}` : undefined;
    });
  }

  seasonsOf(apiFootballId: Signal<number | null>) {
    return httpResource<ApiResponse<number[]>>(() => {
      const id = apiFootballId();
      return id != null ? `${this.base}/api/players/seasons/${id}` : undefined;
    });
  }

  // Promise-shaped variants used by the home page paged store, which needs
  // append-on-load semantics that httpResource (replace-on-URL-change) does
  // not provide out of the box.
  async listPage(page: number, limit: number): Promise<PagedResponse<Player>> {
    return firstValueFrom(
      this.http.get<PagedResponse<Player>>(`${this.base}/api/players`, {
        params: { page, limit },
      }),
    );
  }

  async searchPage(
    name: string,
    page: number,
    limit: number,
  ): Promise<PagedResponse<Player>> {
    return firstValueFrom(
      this.http.get<PagedResponse<Player>>(`${this.base}/api/players/search`, {
        params: { name, page, limit },
      }),
    );
  }

  async create(payload: CreatePlayerRequest): Promise<ApiResponse<Player>> {
    return firstValueFrom(
      this.http.post<ApiResponse<Player>>(`${this.base}/api/players`, payload),
    );
  }

  async import(items: ImportPlayerItem[]): Promise<ApiResponse<Player[]>> {
    return firstValueFrom(
      this.http.post<ApiResponse<Player[]>>(`${this.base}/api/players/import`, items),
    );
  }

  async update(id: string, payload: UpdatePlayerRequest): Promise<ApiResponse<Player>> {
    return firstValueFrom(
      this.http.put<ApiResponse<Player>>(`${this.base}/api/players/${id}`, payload),
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.base}/api/players/${id}`),
    );
  }
}
