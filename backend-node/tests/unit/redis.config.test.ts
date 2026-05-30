import { resolveRedisConfig } from '../../src/config/redis';

describe('resolveRedisConfig', () => {
  const ORIG = process.env.ConnectionStrings__redis;

  beforeEach(() => {
    delete process.env.ConnectionStrings__redis;
  });
  afterAll(() => {
    if (ORIG) process.env.ConnectionStrings__redis = ORIG;
  });

  it('returns local defaults when ConnectionStrings__redis is unset', () => {
    expect(resolveRedisConfig()).toEqual({
      host: 'localhost', port: 6379, tls: false, password: undefined,
      source: 'default-local',
    });
  });

  it('treats whitespace-only as unset (still local default)', () => {
    process.env.ConnectionStrings__redis = '   ';
    expect(resolveRedisConfig().source).toBe('default-local');
  });

  it('parses Aspire local container form "host:port" without password', () => {
    process.env.ConnectionStrings__redis = 'redis:6379';
    expect(resolveRedisConfig()).toEqual({
      host: 'redis', port: 6379, tls: false, password: undefined,
      source: 'ConnectionStrings__redis',
    });
  });

  it('parses StackExchange form with password and ssl=True', () => {
    process.env.ConnectionStrings__redis =
      'cluster.redis.cache.windows.net:6380,password=s3cr3t,ssl=True,abortConnect=False';
    expect(resolveRedisConfig()).toEqual({
      host: 'cluster.redis.cache.windows.net', port: 6380, tls: true, password: 's3cr3t',
      source: 'ConnectionStrings__redis',
    });
  });

  it('defensively trims a stray BOM (U+FEFF) at the head or tail of the password', () => {
    // The parser calls String.prototype.trim() on each option value, which in
    // V8 treats U+FEFF as whitespace. This is intentional: it cleans up
    // paste-from-rich-editor artefacts on the way in, so the password we
    // send to Redis matches the one the server was provisioned with.
    const BOM = '﻿';
    process.env.ConnectionStrings__redis = `redis:6379,password=${BOM}secret`;
    expect(resolveRedisConfig().password).toBe('secret');
  });

  it('handles password values containing "=" via first-occurrence split', () => {
    process.env.ConnectionStrings__redis = 'host:6379,password=p=ss=word';
    expect(resolveRedisConfig().password).toBe('p=ss=word');
  });

  it('is case-insensitive on option keys', () => {
    process.env.ConnectionStrings__redis = 'host:6379,Password=Hello,SSL=TRUE';
    const cfg = resolveRedisConfig();
    expect(cfg.password).toBe('Hello');
    expect(cfg.tls).toBe(true);
  });

  it('accepts the alternate "tls=true" key as well as "ssl=true"', () => {
    process.env.ConnectionStrings__redis = 'host:6380,password=x,tls=true';
    expect(resolveRedisConfig().tls).toBe(true);
  });

  it('defaults port to 6379 when omitted', () => {
    process.env.ConnectionStrings__redis = 'redis,password=x';
    expect(resolveRedisConfig().port).toBe(6379);
  });

  it('ignores unknown options without breaking', () => {
    process.env.ConnectionStrings__redis =
      'host:6379,password=x,abortConnect=False,syncTimeout=10000,defaultDatabase=0';
    const cfg = resolveRedisConfig();
    expect(cfg.host).toBe('host');
    expect(cfg.port).toBe(6379);
    expect(cfg.password).toBe('x');
  });

  it('reports source = ConnectionStrings__redis when env var is honored', () => {
    process.env.ConnectionStrings__redis = 'redis:6379';
    expect(resolveRedisConfig().source).toBe('ConnectionStrings__redis');
  });
});
