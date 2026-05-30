/**
 * Lee la configuración de Redis EXCLUSIVAMENTE de `ConnectionStrings__redis`,
 * la variable que el AppHost de Aspire inyecta vía `.WithReference(redis)`.
 *
 * Por qué solo esa variable:
 *   .NET (StackExchange.Redis vía Aspire.StackExchange.Redis.DistributedCaching)
 *   lee únicamente `ConnectionStrings:redis` y conecta correctamente. Mientras
 *   tanto, leer también `REDIS_URL` o `REDIS_URI` arrastraba otras vars que
 *   en staging contenían un BOM en la password (paste-from-rich-editor) y se
 *   imponían sobre la cadena limpia de Aspire, lo que provocaba WRONGPASS.
 *   Atándonos a la misma variable que .NET, ambos backends comparten la
 *   misma fuente de verdad y desaparece la asimetría.
 *
 * Formato esperado (StackExchange.Redis connection string):
 *   host[:port][,key=value[,key=value...]]
 *
 * Ejemplos válidos:
 *   localhost:6379                                              (Docker local Aspire)
 *   redis:6379,password=secret                                  (ACA Aspire publish)
 *   cluster.redis.cache.windows.net:6380,password=X,ssl=True    (managed Redis)
 *
 * Modo dev sin Aspire: si la variable no existe, devolvemos config local
 * `localhost:6379` sin password. Mantiene el flujo de `npm run dev` standalone.
 */

export interface RedisConnectionConfig {
  host:     string;
  port:     number;
  tls:      boolean;
  password: string | undefined;
  /** Nombre de la env var de origen — útil en logs de arranque. */
  source:   'ConnectionStrings__redis' | 'default-local';
}

const DEFAULT_PORT = 6379;
const ENV_VAR_NAME = 'ConnectionStrings__redis';

export const resolveRedisConfig = (): RedisConnectionConfig => {
  const raw = process.env[ENV_VAR_NAME];
  if (!raw || raw.trim() === '') {
    return {
      host:     'localhost',
      port:     DEFAULT_PORT,
      tls:      false,
      password: undefined,
      source:   'default-local',
    };
  }
  return { ...parseStackExchangeConnectionString(raw.trim()), source: ENV_VAR_NAME };
};

/**
 * Parsea el formato StackExchange.Redis. Tolerante a:
 *   - Sin puerto (asume 6379).
 *   - Keys con cualquier capitalización (`Password`, `PASSWORD`, `Ssl`...).
 *   - Valores con `=` en el password (split por la primera ocurrencia).
 *   - Opciones desconocidas (abortConnect, syncTimeout, ...): se ignoran.
 *   - Espacios sobrantes alrededor de comas y `=`.
 */
const parseStackExchangeConnectionString = (
  conn: string,
): Omit<RedisConnectionConfig, 'source'> => {
  const parts = conn.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) {
    return { host: 'localhost', port: DEFAULT_PORT, tls: false, password: undefined };
  }

  const { host, port } = parseHostPort(parts[0]!);

  let password: string | undefined;
  let tls = false;
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    const key = p.slice(0, eq).trim().toLowerCase();
    const val = p.slice(eq + 1).trim();
    if (key === 'password' && val.length > 0) {
      password = val;
    } else if ((key === 'ssl' || key === 'tls') && val.toLowerCase() === 'true') {
      tls = true;
    }
    // Resto (abortConnect, syncTimeout, defaultDatabase, etc.) — ignorado a propósito.
  }
  return { host, port, tls, password };
};

const parseHostPort = (segment: string): { host: string; port: number } => {
  const colonIdx = segment.lastIndexOf(':');
  if (colonIdx < 0) return { host: segment, port: DEFAULT_PORT };
  const host    = segment.slice(0, colonIdx);
  const portRaw = segment.slice(colonIdx + 1);
  const port    = Number(portRaw);
  return Number.isFinite(port) && port > 0
    ? { host, port }
    : { host: segment, port: DEFAULT_PORT };
};
