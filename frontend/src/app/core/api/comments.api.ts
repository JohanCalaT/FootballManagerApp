import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_URL } from '../tokens/gateway-url.token';
import { ApiResponse } from '../models/api-response.model';
import { Comment, CreateCommentRequest } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(GATEWAY_URL);

  /**
   * Promise-shaped GET — the detail page loads comments inside an async
   * lifecycle (post-player-load) rather than reactively via httpResource,
   * so the optimistic-add pattern can splice into the local list.
   *
   * Returns ApiResponse&lt;Comment[]&gt; — neither backend paginates this
   * endpoint (per their CLAUDE.md contracts).
   */
  async byPlayer(playerId: string): Promise<ApiResponse<Comment[]>> {
    return firstValueFrom(
      this.http.get<ApiResponse<Comment[]>>(
        `${this.base}/api/comments/player/${playerId}`,
      ),
    );
  }

  async create(playerId: string, payload: CreateCommentRequest): Promise<ApiResponse<Comment>> {
    return firstValueFrom(
      this.http.post<ApiResponse<Comment>>(
        `${this.base}/api/comments/player/${playerId}`,
        payload,
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.base}/api/comments/${id}`));
  }
}
