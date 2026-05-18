import { createClient, RedisClientType } from 'redis';
import { resolveRedisConfig } from '../config/redis';

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
 * Conecta a Redis si hay configuración disponible. Llamada una sola vez al
 * arrancar el server. Si falla, deja `instance = NOOP` y loggea un warning
 * — el backend sigue funcional, solo perderá el cache.
 *
 * Pasa host/port/password/tls explícitamente a createClient en vez de un
 * URL para evitar cualquier ambigüedad de URL-decoding en node-redis v5
 * (el formato Aspire ya nos da los componentes directamente).
 */
export const initCache = async (): Promise<CacheService> => {
  const cfg = resolveRedisConfig();

  // Log de arranque — host/port/tls/source siempre, password length para
  // diagnóstico sin filtrar el secreto.
  console.log(
    `[cache] redis target host=${cfg.host}:${cfg.port} tls=${cfg.tls} ` +
    `source=${cfg.source} has_password=${cfg.password !== undefined} ` +
    `pw_len=${cfg.password?.length ?? 0}`,
  );

  // Startup-time hard budget. node-redis v5 con un password incorrecto
  // entra en reconexión infinita y `client.connect()` nunca resuelve, lo
  // que bloquea `app.listen()` y revienta la StartUp probe de Container
  // Apps. Esto emula el comportamiento de StackExchange.Redis de .NET
  // (abortOnConnectFail=false): si no estamos listos en CONNECT_BUDGET_MS,
  // abandonamos y servimos HTTP sin cache.
  const CONNECT_BUDGET_MS = 8_000;
  let client: ReturnType<typeof createClient> | undefined;
  try {
    client = createClient({
      socket: {
        host:           cfg.host,
        port:           cfg.port,
        // `tls` aquí debe ser literal `true` o ausente — no `undefined`
        // (los types de node-redis rechazan undefined). Spread condicional.
        ...(cfg.tls ? { tls: true as const } : {}),
        connectTimeout: 5_000,
        // Cap reintentos para que un fallo de AUTH no spinee para siempre.
        reconnectStrategy: (retries: number) =>
          retries >= 3
            ? new Error(`redis: giving up after ${retries} retries`)
            : Math.min(retries * 200, 3_000),
      },
      // Pasamos password explícito (sin URL-encoding intermediario) para
      // que sea exactamente lo que Aspire pone en `password=...`. Spread
      // condicional porque node-redis tipa password como `string`, no
      // `string | undefined`.
      ...(cfg.password !== undefined ? { password: cfg.password } : {}),
    });
    client.on('connect', () => console.log('[cache] redis socket connect'));
    client.on('ready',   () => console.log('[cache] redis ready'));
    client.on('error', (err: Error) => {
      console.warn('[cache] redis error event:', err.message);
    });
    await Promise.race([
      (async () => { await client!.connect(); await client!.ping(); })(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`redis connect budget exceeded (${CONNECT_BUDGET_MS}ms)`)),
          CONNECT_BUDGET_MS,
        ),
      ),
    ]);
    instance = new RedisCacheService(client as unknown as RedisClientType);
    console.log(`[cache] connected to redis`);
    return instance;
  } catch (err) {
    console.warn('[cache] no se pudo conectar a redis — operando sin cache', err);
    try { await client?.quit(); } catch { /* ignore */ }
    instance = NOOP;
    return instance;
  }
};
