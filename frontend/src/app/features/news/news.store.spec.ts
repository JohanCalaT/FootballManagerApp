import { TestBed } from '@angular/core/testing';

import { NewsApi } from '../../core/api/news.api';
import { NewsEnvelope, Noticia } from '../../core/models/news.model';
import { NewsStore } from './news.store';

function noticia(id: string, titulo = `T-${id}`): Noticia {
  return {
    id,
    titulo,
    contenido: 'c',
    autor: 'admin',
    fechaPub: '2026-01-01T00:00:00Z',
  };
}

function envelope<T>(data: T): NewsEnvelope<T> {
  return { status: 'success', message: 'OK', data };
}

/** Minimal EventSource double that lets the test fire named SSE events. */
class FakeEventSource {
  onopen: ((ev: Event) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  closed = false;
  private readonly listeners = new Map<string, (e: MessageEvent) => void>();

  addEventListener(type: string, cb: (e: MessageEvent) => void): void {
    this.listeners.set(type, cb);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data: unknown): void {
    this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

describe('NewsStore', () => {
  let api: jasmine.SpyObj<NewsApi>;
  let source: FakeEventSource;
  let store: NewsStore;

  beforeEach(() => {
    api = jasmine.createSpyObj<NewsApi>('NewsApi', [
      'listOnce',
      'openStream',
      'publish',
      'remove',
    ]);
    source = new FakeEventSource();
    api.openStream.and.returnValue(source as unknown as EventSource);

    TestBed.configureTestingModule({
      providers: [NewsStore, { provide: NewsApi, useValue: api }],
    });
    store = TestBed.inject(NewsStore);
  });

  it('seeds the list and opens the stream on connect', async () => {
    api.listOnce.and.resolveTo(envelope([noticia('1'), noticia('2')]));

    await store.connect();

    expect(store.news().map((n) => n.id)).toEqual(['1', '2']);
    expect(api.openStream).toHaveBeenCalledTimes(1);
  });

  it('marks live on open and offline on error', async () => {
    api.listOnce.and.resolveTo(envelope([]));
    await store.connect();

    source.onopen?.(new Event('open'));
    expect(store.live()).toBeTrue();

    source.onerror?.(new Event('error'));
    expect(store.live()).toBeFalse();
  });

  it('prepends on the created event (dedup by id)', async () => {
    api.listOnce.and.resolveTo(envelope([noticia('1')]));
    await store.connect();

    source.emit('created', noticia('2', 'Fresh'));

    expect(store.news().map((n) => n.id)).toEqual(['2', '1']);

    // Re-emitting the same id must not duplicate it.
    source.emit('created', noticia('2', 'Fresh edited'));
    expect(store.news().map((n) => n.id)).toEqual(['2', '1']);
    expect(store.news()[0].titulo).toBe('Fresh edited');
  });

  it('removes on the deleted event', async () => {
    api.listOnce.and.resolveTo(envelope([noticia('1'), noticia('2')]));
    await store.connect();

    source.emit('deleted', { id: '1' });

    expect(store.news().map((n) => n.id)).toEqual(['2']);
  });

  it('clears on the reset event', async () => {
    api.listOnce.and.resolveTo(envelope([noticia('1'), noticia('2')]));
    await store.connect();

    source.emit('reset', { reset: true });

    expect(store.news()).toEqual([]);
  });

  it('sets an error when the seed fails', async () => {
    api.listOnce.and.rejectWith(new Error('boom'));

    await store.connect();

    expect(store.error()).toBe('No se pudieron cargar las noticias');
  });

  it('publish delegates to the api and reflects the result optimistically', async () => {
    api.listOnce.and.resolveTo(envelope([]));
    await store.connect();
    api.publish.and.resolveTo(envelope(noticia('9', 'Nueva')));

    const created = await store.publish({
      titulo: 'Nueva',
      contenido: 'c',
      autor: 'admin',
    });

    expect(created.id).toBe('9');
    expect(store.news()[0].id).toBe('9');
  });

  it('remove delegates to the api and drops the row locally', async () => {
    api.listOnce.and.resolveTo(envelope([noticia('1'), noticia('2')]));
    await store.connect();
    api.remove.and.resolveTo();

    await store.remove('1');

    expect(api.remove).toHaveBeenCalledWith('1');
    expect(store.news().map((n) => n.id)).toEqual(['2']);
  });

  it('closes the EventSource on disconnect', async () => {
    api.listOnce.and.resolveTo(envelope([]));
    await store.connect();

    store.disconnect();

    expect(source.closed).toBeTrue();
    expect(store.live()).toBeFalse();
  });
});
