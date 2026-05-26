import { Injectable, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_URL } from '../tokens/gateway-url.token';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { CreateNewsRequest, News } from '../models/news.model';

@Injectable({ providedIn: 'root' })
export class NewsApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(GATEWAY_URL);

  list() {
    return httpResource<PagedResponse<News>>(() => `${this.base}/api/news`);
  }

  async publish(payload: CreateNewsRequest): Promise<ApiResponse<News>> {
    return firstValueFrom(
      this.http.post<ApiResponse<News>>(`${this.base}/api/news-admin`, payload),
    );
  }
}
