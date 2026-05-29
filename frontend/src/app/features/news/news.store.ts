import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { NewsApi } from '../../core/api/news.api';
import { CreateNoticiaRequest, Noticia } from '../../core/models/news.model';

/**
 * Estado en vivo de las noticias.
 *
 * Siembra la lista con `GET /api/news` y a partir de ahí escucha el stream SSE
 * (`/api/news/stream`): `created` antepone, `deleted` quita, `reset` vacía. El
 * `EventSource` reconecta solo ante cortes transitorios (comportamiento nativo);
 * `live` refleja el estado de la conexión para el indicador "En vivo".
 *
 * Es feature-scoped: lo provee la página, no es singleton, y se cierra solo al
 * destruirse vía `DestroyRef`.
 */
@Injectable()
export class NewsStore {
  private readonly api = inject(NewsApi);

  readonly news = signal<Noticia[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly live = signal(false);

  readonly isInitialLoad = computed(
    () => this.loading() && this.news().length === 0,
  );
  readonly isEmpty = computed(
    () => !this.loading() && this.news().length === 0,
  );

  private source: EventSource | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  /** Carga inicial + apertura del stream. Idempotente. */
  async connect(): Promise<void> {
    await this.seed();
    this.openStream();
  }

  disconnect(): void {
    this.source?.close();
    this.source = null;
    this.live.set(false);
  }

  /** Publica y deja que el evento SSE `created` actualice la lista. */
  async publish(payload: CreateNoticiaRequest): Promise<Noticia> {
    const res = await this.api.publish(payload);
    if (res.status !== 'success' || !res.data) {
      throw new Error(res.message || 'No se pudo publicar la noticia');
    }
    // Reflejo optimista por si el stream aún no está abierto en esta vista.
    this.upsert(res.data);
    return res.data;
  }

  /** Elimina y deja que el evento SSE `deleted` actualice la lista. */
  async remove(id: string): Promise<void> {
    await this.api.remove(id);
    this.removeById(id);
  }

  private async seed(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.listOnce();
      this.news.set(res.data ?? []);
    } catch {
      this.error.set('No se pudieron cargar las noticias');
    } finally {
      this.loading.set(false);
    }
  }

  private openStream(): void {
    if (this.source || typeof EventSource === 'undefined') return;

    const source = this.api.openStream();
    this.source = source;

    source.onopen = () => this.live.set(true);
    source.onerror = () => this.live.set(false); // EventSource reintenta solo

    source.addEventListener('created', (e) => {
      const noticia = this.parse<Noticia>((e as MessageEvent).data);
      if (noticia) this.upsert(noticia);
    });
    source.addEventListener('deleted', (e) => {
      const payload = this.parse<{ id: string }>((e as MessageEvent).data);
      if (payload?.id) this.removeById(payload.id);
    });
    source.addEventListener('reset', () => this.news.set([]));
  }

  private upsert(noticia: Noticia): void {
    this.news.update((list) => {
      const rest = list.filter((n) => n.id !== noticia.id);
      return [noticia, ...rest];
    });
  }

  private removeById(id: string): void {
    this.news.update((list) => list.filter((n) => n.id !== id));
  }

  private parse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
