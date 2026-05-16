/**
 * Resuelve la URL de Redis desde las env vars que el AppHost de Aspire
 * inyecta vía `.WithReference(redis)`.
 *
 * Aspire formato StackExchange.Redis (lo que llega a `ConnectionStrings__redis`):
 *   - `localhost:6379`               (RunAsContainer en local)
 *   - `host:port,password=...,ssl=True,abortConnect=False` (Azure Managed Redis)
 *
 * El cliente `redis` v5 acepta URLs `redis://[user][:pass]@host:port[/db]` o
 * `rediss://...` para TLS. Convertimos la cadena de Aspire a esa forma.
 */
export const resolveRedisUrl = (): string | undefined => {
  const raw =
    process.env.REDIS_URL ??
    process.env.ConnectionStrings__redis ??
    process.env.REDIS_CONNECTION_STRING;

  if (!raw || raw.trim() === '') return undefined;
  const conn = raw.trim();

  // Ya es una URL — úsala tal cual
  if (conn.startsWith('redis://') || conn.startsWith('rediss://')) return conn;

  // Formato StackExchange: host[:port][,key=value...]
  const parts = conn.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) return undefined;
  const hostPort = parts[0]!;

  const opts = new Map<string, string>();
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    opts.set(p.slice(0, eq).trim().toLowerCase(), p.slice(eq + 1).trim());
  }

  const password = opts.get('password');
  const useSsl   = (opts.get('ssl') ?? '').toLowerCase() === 'true';
  const scheme   = useSsl ? 'rediss' : 'redis';
  const userInfo = password ? `:${encodeURIComponent(password)}@` : '';
  return `${scheme}://${userInfo}${hostPort}`;
};
