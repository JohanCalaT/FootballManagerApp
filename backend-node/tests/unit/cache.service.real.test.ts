/**
 * Tests de la clase real `RedisCacheService` + `initCache`, mockeando
 * `redis.createClient` para no necesitar un Redis físico.
 */

const mockRedisClient = {
  on:           jest.fn(),
  connect:      jest.fn(),
  ping:         jest.fn(),
  get:          jest.fn(),
  set:          jest.fn(),
  del:          jest.fn(),
  scanIterator: jest.fn(),
  quit:         jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

import { initCache, getCache, __resetCacheForTests } from '../../src/services/cache.service';

const ORIG_REDIS_URL = process.env.REDIS_URL;
const ORIG_CONN      = process.env.ConnectionStrings__redis;

const setupConnectedClient = () => {
  mockRedisClient.connect.mockResolvedValue(undefined);
  mockRedisClient.ping   .mockResolvedValue('PONG');
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetCacheForTests();
  delete process.env.REDIS_URL;
  delete process.env.ConnectionStrings__redis;
});

afterAll(() => {
  if (ORIG_REDIS_URL) process.env.REDIS_URL = ORIG_REDIS_URL;
  if (ORIG_CONN)      process.env.ConnectionStrings__redis = ORIG_CONN;
});

describe('initCache', () => {
  it('leaves cache as NOOP when no env var is set', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const cache = await initCache();

    expect(cache.isEnabled()).toBe(false);
    expect(mockRedisClient.connect).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('connects and enables cache when REDIS_URL is valid', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    setupConnectedClient();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    const cache = await initCache();

    expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.ping).toHaveBeenCalledTimes(1);
    expect(cache.isEnabled()).toBe(true);
    log.mockRestore();
  });

  it('degrades to NOOP when connect() throws', async () => {
    process.env.REDIS_URL = 'redis://unreachable:6379';
    mockRedisClient.connect.mockRejectedValue(new Error('ECONNREFUSED'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const cache = await initCache();

    expect(cache.isEnabled()).toBe(false);
    warn.mockRestore();
  });

  it('attaches an "error" handler that warns without crashing', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    setupConnectedClient();
    const log  = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await initCache();
    // Simula un error post-conexión
    const errorHandler = mockRedisClient.on.mock.calls.find(([ev]) => ev === 'error')?.[1] as
      ((e: Error) => void) | undefined;
    errorHandler?.(new Error('disconnected mid-op'));

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('redis error event'),
      expect.stringContaining('disconnected mid-op'),
    );
    log.mockRestore();
    warn.mockRestore();
  });
});

describe('RedisCacheService — métodos contra el client mockeado', () => {
  beforeEach(async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    setupConnectedClient();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await initCache();
  });

  it('getJson parses the stored JSON', async () => {
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({ a: 1 }));
    expect(await getCache().getJson('k')).toEqual({ a: 1 });
    expect(mockRedisClient.get).toHaveBeenCalledWith('k');
  });

  it('getJson returns null when redis returns null', async () => {
    mockRedisClient.get.mockResolvedValueOnce(null);
    expect(await getCache().getJson('k')).toBeNull();
  });

  it('getJson swallows errors and returns null (resilient cache)', async () => {
    mockRedisClient.get.mockRejectedValueOnce(new Error('boom'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await getCache().getJson('k')).toBeNull();

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('setJson serializes value and forwards EX ttl', async () => {
    mockRedisClient.set.mockResolvedValueOnce('OK');

    await getCache().setJson('k', { value: 42 }, 600);

    expect(mockRedisClient.set).toHaveBeenCalledWith('k', '{"value":42}', { EX: 600 });
  });

  it('setJson swallows errors silently', async () => {
    mockRedisClient.set.mockRejectedValueOnce(new Error('boom'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(getCache().setJson('k', { v: 1 }, 60)).resolves.toBeUndefined();

    warn.mockRestore();
  });

  it('del forwards to client.del', async () => {
    mockRedisClient.del.mockResolvedValueOnce(1);
    await getCache().del('k');
    expect(mockRedisClient.del).toHaveBeenCalledWith('k');
  });

  it('del swallows errors silently', async () => {
    mockRedisClient.del.mockRejectedValueOnce(new Error('boom'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(getCache().del('k')).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it('removePattern iterates with scanIterator and deletes by batch', async () => {
    // scanIterator es un async iterator; lo simulamos como una mini secuencia
    mockRedisClient.scanIterator.mockReturnValueOnce((async function* () {
      yield ['af:player:stats:1:2022', 'af:player:stats:2:2023'];
      yield 'af:player:stats:3:2024';
    })());
    mockRedisClient.del.mockResolvedValue(1);

    const count = await getCache().removePattern('af:*');

    expect(count).toBe(3);
    expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
  });

  it('removePattern swallows errors and returns count up to the failure', async () => {
    mockRedisClient.scanIterator.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await getCache().removePattern('af:*')).toBe(0);

    warn.mockRestore();
  });

  it('disconnect calls client.quit', async () => {
    mockRedisClient.quit.mockResolvedValueOnce('OK');
    await getCache().disconnect();
    expect(mockRedisClient.quit).toHaveBeenCalled();
  });

  it('disconnect ignores quit errors', async () => {
    mockRedisClient.quit.mockRejectedValueOnce(new Error('boom'));
    await expect(getCache().disconnect()).resolves.toBeUndefined();
  });
});
