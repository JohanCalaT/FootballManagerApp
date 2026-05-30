import {
  CacheService, __resetCacheForTests, __setCacheForTests, getCache,
} from '../../src/services/cache.service';

/** In-memory mock con TTL ignorado — suficiente para verificar contrato. */
class InMemoryCache implements CacheService {
  private store = new Map<string, string>();
  public lastTtlByKey = new Map<string, number>();

  isEnabled(): boolean { return true; }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    return raw === undefined ? null : (JSON.parse(raw) as T);
  }
  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, JSON.stringify(value));
    this.lastTtlByKey.set(key, ttlSeconds);
  }
  async del(key: string): Promise<void> { this.store.delete(key); }
  async removePattern(pattern: string): Promise<number> {
    const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let n = 0;
    for (const k of [...this.store.keys()]) {
      if (re.test(k)) { this.store.delete(k); n += 1; }
    }
    return n;
  }
  async getOrSet<T>(key: string, ttl: number, factory: () => Promise<T | null>): Promise<T | null> {
    const hit = await this.getJson<T>(key);
    if (hit !== null) return hit;
    const v = await factory();
    if (v !== null) await this.setJson(key, v, ttl);
    return v;
  }
  async disconnect(): Promise<void> {}
}

describe('cache.service — fallback NO-OP por defecto', () => {
  afterEach(() => __resetCacheForTests());

  it('returns NOOP when no instance has been initialized', () => {
    const c = getCache();
    expect(c.isEnabled()).toBe(false);
  });

  it('NOOP getJson always returns null', async () => {
    expect(await getCache().getJson('any:key')).toBeNull();
  });

  it('NOOP setJson is a silent no-op (subsequent get still misses)', async () => {
    await getCache().setJson('foo', { x: 1 }, 60);
    expect(await getCache().getJson('foo')).toBeNull();
  });

  it('NOOP del / removePattern are silent', async () => {
    await getCache().del('x');
    expect(await getCache().removePattern('af:*')).toBe(0);
  });

  it('NOOP getOrSet always calls factory (zero cache effect)', async () => {
    const factory = jest.fn().mockResolvedValue({ value: 42 });

    const first  = await getCache().getOrSet('k', 60, factory);
    const second = await getCache().getOrSet('k', 60, factory);

    expect(first).toEqual({ value: 42 });
    expect(second).toEqual({ value: 42 });
    expect(factory).toHaveBeenCalledTimes(2); // sin cache → llama 2 veces
  });
});

describe('cache.service — contrato cuando hay client (in-memory mock)', () => {
  let mock: InMemoryCache;

  beforeEach(() => {
    mock = new InMemoryCache();
    __setCacheForTests(mock);
  });
  afterEach(() => __resetCacheForTests());

  it('isEnabled() is true when a client is wired', () => {
    expect(getCache().isEnabled()).toBe(true);
  });

  it('setJson + getJson round-trip preserves the value and TTL', async () => {
    await getCache().setJson('af:player:stats:154:2022', { hi: true }, 2592000);
    expect(await getCache().getJson('af:player:stats:154:2022')).toEqual({ hi: true });
    expect(mock.lastTtlByKey.get('af:player:stats:154:2022')).toBe(2592000);
  });

  it('getOrSet hits the cache on the second call (factory called once)', async () => {
    const factory = jest.fn().mockResolvedValue({ stats: 'data' });

    const first  = await getCache().getOrSet('k', 60, factory);
    const second = await getCache().getOrSet('k', 60, factory);

    expect(first).toEqual({ stats: 'data' });
    expect(second).toEqual({ stats: 'data' });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('getOrSet does NOT cache null values (next call hits factory again)', async () => {
    const factory = jest.fn().mockResolvedValue(null);

    await getCache().getOrSet('k', 60, factory);
    await getCache().getOrSet('k', 60, factory);

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('removePattern matches af:* keys only', async () => {
    await getCache().setJson('af:player:stats:1:2022',  { a: 1 }, 60);
    await getCache().setJson('af:player:stats:2:2023',  { a: 2 }, 60);
    await getCache().setJson('players:id:abc',          { a: 3 }, 60);

    const removed = await getCache().removePattern('af:*');

    expect(removed).toBe(2);
    expect(await getCache().getJson('players:id:abc')).toEqual({ a: 3 });
    expect(await getCache().getJson('af:player:stats:1:2022')).toBeNull();
  });

  it('del removes a single key', async () => {
    await getCache().setJson('k', { v: 1 }, 60);
    await getCache().del('k');
    expect(await getCache().getJson('k')).toBeNull();
  });
});
