import { resolveRedisUrl } from '../../src/config/redis';

describe('resolveRedisUrl', () => {
  const ORIG = {
    REDIS_URL:                process.env.REDIS_URL,
    ConnectionStrings__redis: process.env.ConnectionStrings__redis,
    REDIS_CONNECTION_STRING:  process.env.REDIS_CONNECTION_STRING,
  };

  beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.ConnectionStrings__redis;
    delete process.env.REDIS_CONNECTION_STRING;
  });
  afterAll(() => {
    if (ORIG.REDIS_URL)                process.env.REDIS_URL                = ORIG.REDIS_URL;
    if (ORIG.ConnectionStrings__redis) process.env.ConnectionStrings__redis = ORIG.ConnectionStrings__redis;
    if (ORIG.REDIS_CONNECTION_STRING)  process.env.REDIS_CONNECTION_STRING  = ORIG.REDIS_CONNECTION_STRING;
  });

  it('returns undefined when no env var is set', () => {
    expect(resolveRedisUrl()).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    process.env.REDIS_URL = '   ';
    expect(resolveRedisUrl()).toBeUndefined();
  });

  it('passes through a redis:// URL unchanged', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    expect(resolveRedisUrl()).toBe('redis://localhost:6379');
  });

  it('passes through a rediss:// URL unchanged', () => {
    process.env.REDIS_URL = 'rediss://user:pass@cluster.redis:6380/0';
    expect(resolveRedisUrl()).toBe('rediss://user:pass@cluster.redis:6380/0');
  });

  it('converts Aspire local container format "host:port" to redis://', () => {
    process.env.ConnectionStrings__redis = 'localhost:6379';
    expect(resolveRedisUrl()).toBe('redis://localhost:6379');
  });

  it('converts StackExchange format with password and ssl=True to rediss://', () => {
    process.env.ConnectionStrings__redis =
      'cluster.redis.cache.windows.net:6380,password=s3cr3t,ssl=True,abortConnect=False';
    const url = resolveRedisUrl();
    expect(url).toContain('rediss://');
    expect(url).toContain(':s3cr3t@cluster.redis.cache.windows.net:6380');
  });

  it('encodes special chars in password', () => {
    process.env.ConnectionStrings__redis =
      'host:6379,password=p@ss/w%d,ssl=False';
    const url = resolveRedisUrl()!;
    expect(url).toMatch(/^redis:\/\/:p%40ss%2Fw%25d@host:6379$/);
  });

  it('prefers REDIS_URL over ConnectionStrings__redis when both set', () => {
    process.env.REDIS_URL                = 'redis://primary:6379';
    process.env.ConnectionStrings__redis = 'secondary:6379';
    expect(resolveRedisUrl()).toBe('redis://primary:6379');
  });

  it('falls back to REDIS_CONNECTION_STRING when the others are absent', () => {
    process.env.REDIS_CONNECTION_STRING = 'redis://fallback:6379';
    expect(resolveRedisUrl()).toBe('redis://fallback:6379');
  });

  it('strips a leading BOM from the password in StackExchange format', () => {
    const BOM = '\uFEFF';
    process.env.ConnectionStrings__redis =
      `host:6379,password=${BOM}cleanpw,ssl=False`;
    const url = resolveRedisUrl()!;
    expect(url).toBe('redis://:cleanpw@host:6379');
  });

  it('strips a leading BOM from the password embedded in a redis:// URL', () => {
    // Aspire publishes redis://:%EF%BB%BF<rest>@redis:6379 when the
    // upstream secret was pasted with a BOM. The decoded password
    // becomes "\uFEFFsecret" and Redis rejects it with WRONGPASS.
    process.env.REDIS_URL = 'redis://:%EF%BB%BFsecret@redis:6379';
    expect(resolveRedisUrl()).toBe('redis://:secret@redis:6379');
  });

  it('leaves a clean redis:// URL untouched even after BOM sanitisation', () => {
    process.env.REDIS_URL = 'redis://:cleansecret@redis:6379';
    expect(resolveRedisUrl()).toBe('redis://:cleansecret@redis:6379');
  });
});
