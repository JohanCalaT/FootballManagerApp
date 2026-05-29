import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_URL } from '../tokens/gateway-url.token';
import { BackendChoice } from '../state/backend-choice.signal';

/** Estado del selector de backend del Gateway (`GET/POST /config/backend`). */
export interface BackendStatus {
  active: BackendChoice;
  available: string[];
}

/**
 * Cliente del selector de backend del Gateway YARP.
 *
 * El Gateway mantiene el backend activo en estado de servidor
 * (BackendStrategyFactory) y descarta cualquier cabecera `X-Backend-Target`
 * entrante, así que el toggle del front DEBE pasar por este endpoint —
 * no por cabeceras. `/config/backend` cuelga del Gateway (no de `/api`).
 */
@Injectable({ providedIn: 'root' })
export class ConfigApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(GATEWAY_URL);

  /** Backend activo actual del Gateway. */
  async getActive(): Promise<BackendStatus> {
    return firstValueFrom(
      this.http.get<BackendStatus>(`${this.base}/config/backend`),
    );
  }

  /** Cambia el backend activo del Gateway y devuelve el estado resultante. */
  async setActive(backend: BackendChoice): Promise<BackendStatus> {
    return firstValueFrom(
      this.http.post<BackendStatus>(`${this.base}/config/backend`, { backend }),
    );
  }
}
