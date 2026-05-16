import { createClient, RedisClientType } from 'redis';
import { resolveRedisUrl } from '../config/redis';

/**
 * Cache distribuido sobre Redis. Si Redis no está disponible (env vacía,
 * conexión rechazada, ping fallido) el cache degrada a NO-OP: `getJson`
 * siempre devuelve null y `setJson` es silencioso. Así el backend sigue
 * funcionando sin Redis (pega a API-Football cada vez, paga la cuota,
 * pero no crashea).
 *
 * Las keys siguen la convención compartida con .NET (CLAUDE.md raíz):
 *   - af:player:stats:{apiFootballId}:{season}   TTL 30d
 *   - af:player:seasons:{apiFootballId}          TTL 7d
 *   - af:profiles:search:{queryNorm}:p{page}     TTL 6h
 */

export interface CacheService {
  isEnabled(): boolean;
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  removePattern(pattern: string): Promise<number>;
  /** Cache-aside: si miss, llama factory, guarda con TTL, devuelve. */
  getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T | null>): Promise<T | null>;
  /** Cierra la conexión — usado en server shutdown y tests. */
  disconnect(): Promise<void>;
}

// ─────────────── No-op fallback ───────────────

const NOOP: CacheService = {
  isEnabled: () => false,
  getJson: async () => null,
  setJson: async () => undefined,
  del: async () => undefined,
  removePattern: async () => 0,
  getOrSet: async <T>(_key: string, _ttl: number, factory: () => Promise<T | null>) => factory(),
  disconnect: async () => undefined,
};

// ─────────────── Implementación real ───────────────

class RedisCacheService implements CacheService {
  constructor(private readonly client: RedisClientType) {}

  isEnabled(): boolean { return true; }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[cache] getJson(${key}) failed`, err);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
      console.warn(`[cache] setJson(${key}) failed`, err);
    }
  }

  async del(key: string): Promise<void> {
    try { await this.client.del(key); }
    catch (err) { console.warn(`[cache] del(${key}) failed`, err); }
  }

  async removePattern(pattern: string): Promise<number> {
    let count = 0;
    try {
      for await (const key of this.client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        const keys = Array.isArray(key) ? key : [key];
        if (keys.length === 0) continue;
        await this.client.del(keys);
        count += keys.length;
      }
    } catch (err) {
      console.warn(`[cache] removePattern(${pattern}) failed`, err);
    }
    return count;
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T | null>,
  ): Promise<T | null> {
    const hit = await this.getJson<T>(key);
    if (hit !== null) return hit;
    const value = await factory();
    if (value !== null) await this.setJson(key, value, ttlSeconds);
    return value;
  }

  async disconnect(): Promise<void> {
    try { await this.client.quit(); }
    catch { /* ignore */ }
  }
}

// ─────────────── Singleton + bootstrap ───────────────

let instance: CacheService = NOOP;

export const getCache = (): CacheService => instance;

/** Solo para tests. */
export const __setCacheForTests = (svc: CacheService): void => { instance = svc; };
export const __resetCacheForTests = (): void => { instance = NOOP; };

/**
 * Conecta a Redis si hay URL configurada. Llamada una sola vez al arrancar
 * el server. Si falla, deja `instance = NOOP` y loggea un warning — el
 * backend sigue funcional, solo perderá el cache.
 */
export const initCache = async (): Promise<CacheService> => {
  const url = resolveRedisUrl();
  if (!url) {
    console.warn('[cache] sin REDIS_URL/ConnectionStrings__redis — operando sin cache');
    instance = NOOP;
    return instance;
  }
  try {
    const client = createClient({
      url,
      socket: buildSocketOptions(url),
    });
    client.on('error', (err: Error) => {
      console.warn('[cache] redis error event:', err.message);
    });
    await client.connect();
    await client.ping();
    instance = new RedisCacheService(client as unknown as RedisClientType);
    console.log(`[cache] connected to redis`);
    return instance;
  } catch (err) {
    console.warn('[cache] no se pudo conectar a redis — operando sin cache', err);
    instance = NOOP;
    return instance;
  }
};

/**
 * Build socket opts. Caso particular Aspire local:
 *   `AddAzureManagedRedis(...).RunAsContainer(...)` levanta un contenedor
 *   Redis con TLS y cert AUTOFIRMADO. El connection string trae `ssl=True`,
 *   que pasamos a `rediss://`, y el cliente Node rechaza el cert.
 *   Para hosts loopback aceptamos cert no verificado — solo en local dev,
 *   nunca contra un Azure Managed Redis real (esos llevan cert válido).
 *
 * Override manual: `REDIS_TLS_REJECT_UNAUTHORIZED=false` fuerza la
 * aceptación si tu Redis remoto también usa self-signed por algún motivo.
 */
const buildSocketOptions = (url: string): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    connectTimeout: 5_000,
    reconnectStrategy: (retries: number) => Math.min(retries * 200, 3_000),
  };
  let parsed: URL;
  try { parsed = new URL(url); } catch { return base; }
  const isTls       = parsed.protocol === 'rediss:';
  const isLoopback  = ['localhost', '127.0.0.1', '::1', 'host.docker.internal']
    .includes(parsed.hostname);
  const overrideEnv = (process.env.REDIS_TLS_REJECT_UNAUTHORIZED ?? '').toLowerCase() === 'false';
  if (isTls && (isLoopback || overrideEnv)) {
    return { ...base, tls: true, rejectUnauthorized: false };
  }
  return base;
};
