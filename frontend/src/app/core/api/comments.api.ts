import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_URL } from '../tokens/gateway-url.token';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { Comment, CreateCommentRequest } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(GATEWAY_URL);

  byPlayer(playerId: Signal<string | null>) {
    return httpResource<PagedResponse<Comment>>(() => {
      const id = playerId();
      return id ? `${this.base}/api/comments/player/${id}` : undefined;
    });
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
