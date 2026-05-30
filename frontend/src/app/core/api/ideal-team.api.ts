import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_URL } from '../tokens/gateway-url.token';
import { ApiResponse } from '../models/api-response.model';
import { IdealTeamRequest, IdealTeamResponse } from '../models/ideal-team.model';

@Injectable({ providedIn: 'root' })
export class IdealTeamApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(GATEWAY_URL);

  async generate(payload: IdealTeamRequest): Promise<ApiResponse<IdealTeamResponse>> {
    return firstValueFrom(
      this.http.post<ApiResponse<IdealTeamResponse>>(
        `${this.base}/api/ideal-team`,
        payload,
      ),
    );
  }
}
