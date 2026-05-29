import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_URL } from '../tokens/gateway-url.token';
import {
  CreateNoticiaRequest,
  EstadoServicio,
  NewsEnvelope,
  Noticia,
} from '../models/news.model';

/**
 * Cliente del subsistema de Noticias (CORBA) a través del Gateway YARP.
 *
 * - Lectura/publicación/borrado: `/api/news*` (envelope CORBA `{status,message,data}`).
 * - Operacional admin: `/api/news-admin/*`.
 * - Tiempo real: `openStream()` abre un `EventSource` SSE (`/api/news/stream`).
 *
 * El toggle `X-Backend-Target` NO aplica: CORBA es una única implementación.
 * El stream es público (GET) y `EventSource` no envía cabeceras, así que no
 * lleva `Authorization`; la UI se protege con guards.
 */
@Injectable({ providedIn: 'root' })
export class NewsApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(GATEWAY_URL);

  /** Semilla inicial de la lista antes de escuchar el stream. */
  async listOnce(): Promise<NewsEnvelope<Noticia[]>> {
    return firstValueFrom(
      this.http.get<NewsEnvelope<Noticia[]>>(`${this.base}/api/news`),
    );
  }

  async getById(id: string): Promise<NewsEnvelope<Noticia>> {
    return firstValueFrom(
      this.http.get<NewsEnvelope<Noticia>>(`${this.base}/api/news/${id}`),
    );
  }

  /** Publicar (admin). El adapter devuelve 201 con la noticia creada. */
  async publish(payload: CreateNoticiaRequest): Promise<NewsEnvelope<Noticia>> {
    return firstValueFrom(
      this.http.post<NewsEnvelope<Noticia>>(`${this.base}/api/news`, payload),
    );
  }

  /** Eliminar (admin). 204 sin cuerpo. */
  async remove(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.base}/api/news/${id}`),
    );
  }

  // --- Operacional (admin) ---

  async status(): Promise<NewsEnvelope<EstadoServicio>> {
    return firstValueFrom(
      this.http.get<NewsEnvelope<EstadoServicio>>(`${this.base}/api/news-admin/status`),
    );
  }

  /** Vacía todas las noticias. 204 sin cuerpo. */
  async reset(): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.base}/api/news-admin/reset`, {}),
    );
  }

  async setMaxSize(limite: number): Promise<NewsEnvelope<EstadoServicio>> {
    return firstValueFrom(
      this.http.put<NewsEnvelope<EstadoServicio>>(
        `${this.base}/api/news-admin/config/max-size`,
        { limite },
      ),
    );
  }

  /**
   * Abre el stream SSE de noticias. Devuelve el `EventSource` para que el
   * llamante registre los listeners (`created`/`deleted`/`reset`) y lo cierre.
   */
  openStream(): EventSource {
    return new EventSource(`${this.base}/api/news/stream`);
  }
}
