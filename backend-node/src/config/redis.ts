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
 *
 * Sanitisation: GitHub Secrets pasted from rich editors sometimes carry a
 * U+FEFF byte-order mark at the start of the password. The BOM travels
 * through azd, Aspire and Key Vault unchanged, and Redis then rejects
 * AUTH with WRONGPASS because the password our client sends is a byte
 * longer than the one Redis was provisioned with (or vice-versa). We
 * strip leading BOMs and whitespace from the password here so any future
 * pasted secret behaves the same as a hand-typed one.
 */

const stripBom = (value: string): string => value.replace(/^\uFEFF/, '').trim();

export const resolveRedisUrl = (): string | undefined => {
  const raw =
    process.env.REDIS_URL ??
    process.env.ConnectionStrings__redis ??
    process.env.REDIS_CONNECTION_STRING;

  if (!raw || raw.trim() === '') return undefined;
  const conn = raw.trim();

  // Ya es una URL — sanitiza el password embebido (si lo hay) y devuélvela.
  if (conn.startsWith('redis://') || conn.startsWith('rediss://')) {
    return sanitiseEmbeddedPassword(conn);
  }

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

  const rawPassword = opts.get('password');
  const password    = rawPassword !== undefined ? stripBom(rawPassword) : undefined;
  const useSsl      = (opts.get('ssl') ?? '').toLowerCase() === 'true';
  const scheme      = useSsl ? 'rediss' : 'redis';
  const userInfo    = password ? `:${encodeURIComponent(password)}@` : '';
  return `${scheme}://${userInfo}${hostPort}`;
};

/**
 * Aspire publishes the cloud-mode connection as a real URL (redis://:PW@host:port).
 * When the upstream secret had a stray BOM, the URL we receive looks like
 * `redis://:%EF%BB%BFsecret@host:6379` and the node client sends the
 * BOM-prefixed bytes as the password, getting WRONGPASS from Redis. Rebuild
 * the URL with a BOM-stripped password.
 */
const sanitiseEmbeddedPassword = (url: string): string => {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return url; }
  if (!parsed.password) return url;

  const decoded  = decodeURIComponent(parsed.password);
  const stripped = stripBom(decoded);
  if (stripped === decoded) return url;

  parsed.password = encodeURIComponent(stripped);
  return parsed.toString();
};
