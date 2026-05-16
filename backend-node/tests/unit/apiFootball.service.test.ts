/**
 * Tests directos del cliente API-Football. Mockeamos axios para no tocar
 * red, no gastar cuota y poder simular cada rama (HTTP 200 con errors
 * poblado, 429, 401, timeout, results=0, etc.).
 */
import axios, { AxiosError } from 'axios';
import {
  ApiFootballAuthenticationFailed, ApiFootballDailyQuotaExceeded,
  ApiFootballInvalidParameter, ApiFootballNotFound, ApiFootballRateLimited,
  ApiFootballSeasonNotAvailable, ApiFootballTimeout, ApiFootballUpstreamError,
} from '../../src/errors/apiFootball.errors';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Importamos el service DESPUÉS de mockear axios — el create se llamará
// con el mock, y getClient guardará el client mockeado.
import {
  __resetClientForTests, getPlayerWithStats,
} from '../../src/services/apiFootball.service';

interface MockClient {
  get: jest.Mock;
}
let mockClient: MockClient;

const buildEnvelope = (overrides: Partial<{
  errors: unknown; results: number; response: unknown[];
}> = {}) => ({
  get: '/players',
  errors: [],
  results: 0,
  paging: { current: 1, total: 1 },
  response: [],
  ...overrides,
});

beforeEach(() => {
  mockClient = { get: jest.fn() };
  mockedAxios.create.mockReturnValue(mockClient as unknown as ReturnType<typeof axios.create>);
  // isAxiosError pasa por axios.isAxiosError — usamos el real, NO mock
  mockedAxios.isAxiosError.mockImplementation(
    ((err: unknown) =>
      typeof err === 'object' && err !== null && (err as { isAxiosError?: boolean }).isAxiosError === true
    ) as unknown as typeof axios.isAxiosError,
  );
  process.env.API_FOOTBALL_KEY = 'test-key';
  __resetClientForTests();
});

afterEach(() => jest.clearAllMocks());

describe('getPlayerWithStats — validación previa (cero HTTP)', () => {
  it('throws ApiFootballInvalidParameter when id <= 0', async () => {
    await expect(getPlayerWithStats(0, 2022)).rejects.toBeInstanceOf(ApiFootballInvalidParameter);
    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('throws ApiFootballSeasonNotAvailable when season not in [2022,2023,2024]', async () => {
    await expect(getPlayerWithStats(154, 2019)).rejects.toBeInstanceOf(ApiFootballSeasonNotAvailable);
    expect(mockClient.get).not.toHaveBeenCalled();
  });
});

describe('getPlayerWithStats — happy path y vacío', () => {
  it('returns the first response item when results > 0', async () => {
    const payload = {
      player: { id: 154, name: 'L. Messi' },
      statistics: [{ team: { id: 85, name: 'PSG' }, league: { id: 61, name: 'Ligue 1', season: 2022 } }],
    };
    mockClient.get.mockResolvedValueOnce({
      data: buildEnvelope({ results: 1, response: [payload] }),
    });

    const result = await getPlayerWithStats(154, 2022);

    expect(result).toEqual(payload);
    expect(mockClient.get).toHaveBeenCalledWith('/players', { params: { id: 154, season: 2022 } });
  });

  it('returns null when results=0 (player did not play that season)', async () => {
    mockClient.get.mockResolvedValueOnce({ data: buildEnvelope({ results: 0 }) });

    const result = await getPlayerWithStats(154, 2022);
    expect(result).toBeNull();
  });
});

describe('getPlayerWithStats — body errors (HTTP 200 != éxito)', () => {
  type ErrCtor = new (...args: never[]) => Error;
  const cases: Array<[string, unknown, ErrCtor]> = [
    ['missing application key',          { token: 'Missing application key' },                                   ApiFootballAuthenticationFailed as ErrCtor],
    ['daily quota',                      { rateLimit: 'You have reached the request limit for the day' },        ApiFootballDailyQuotaExceeded   as ErrCtor],
    ['rate limit',                       { requests: 'You have reached the rate limit per minute' },             ApiFootballRateLimited          as ErrCtor],
    ['no coverage / plan',               { plan: 'plan does not allow access to this season' },                  ApiFootballSeasonNotAvailable   as ErrCtor],
    ['fallback upstream when unknown',   { something: 'weird body error' },                                      ApiFootballUpstreamError        as ErrCtor],
  ];

  it.each(cases)('classifies "%s" → %s', async (_label, errors, ExpectedErr) => {
    mockClient.get.mockResolvedValueOnce({
      data: buildEnvelope({ errors, results: 0 }),
    });
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ExpectedErr);
  });

  it('treats `errors: []` as no error', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: buildEnvelope({ errors: [], results: 0 }),
    });
    const result = await getPlayerWithStats(154, 2022);
    expect(result).toBeNull(); // results=0 → null, no error
  });

  it('treats `errors: {}` as no error', async () => {
    mockClient.get.mockResolvedValueOnce({
      data: buildEnvelope({ errors: {}, results: 0 }),
    });
    const result = await getPlayerWithStats(154, 2022);
    expect(result).toBeNull();
  });
});

describe('getPlayerWithStats — errores axios', () => {
  const axiosErr = (overrides: Record<string, unknown>): AxiosError => ({
    isAxiosError: true,
    name: 'AxiosError',
    message: 'mocked',
    toJSON: () => ({}),
    ...overrides,
  } as unknown as AxiosError);

  it('maps ECONNABORTED → Timeout', async () => {
    mockClient.get.mockRejectedValueOnce(axiosErr({ code: 'ECONNABORTED' }));
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ApiFootballTimeout);
  });

  it('maps HTTP 401 → AuthenticationFailed', async () => {
    mockClient.get.mockRejectedValueOnce(axiosErr({
      response: { status: 401 } as unknown as AxiosError['response'],
    }));
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ApiFootballAuthenticationFailed);
  });

  it('maps HTTP 403 → AuthenticationFailed', async () => {
    mockClient.get.mockRejectedValueOnce(axiosErr({
      response: { status: 403 } as AxiosError['response'],
    }));
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ApiFootballAuthenticationFailed);
  });

  it('maps HTTP 429 → RateLimited', async () => {
    mockClient.get.mockRejectedValueOnce(axiosErr({
      response: { status: 429 } as AxiosError['response'],
    }));
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ApiFootballRateLimited);
  });

  it('maps HTTP 404 → NotFound', async () => {
    mockClient.get.mockRejectedValueOnce(axiosErr({
      response: { status: 404 } as AxiosError['response'],
    }));
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ApiFootballNotFound);
  });

  it('maps HTTP 499 → SeasonNotAvailable', async () => {
    mockClient.get.mockRejectedValueOnce(axiosErr({
      response: { status: 499 } as AxiosError['response'],
    }));
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ApiFootballSeasonNotAvailable);
  });

  it('maps HTTP 500 → UpstreamError', async () => {
    mockClient.get.mockRejectedValueOnce(axiosErr({
      response: { status: 500 } as AxiosError['response'],
    }));
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ApiFootballUpstreamError);
  });
});

describe('getPlayerWithStats — sin API_FOOTBALL_KEY', () => {
  it('throws ApiFootballAuthenticationFailed when env var is missing', async () => {
    delete process.env.API_FOOTBALL_KEY;
    __resetClientForTests();
    await expect(getPlayerWithStats(154, 2022)).rejects.toBeInstanceOf(ApiFootballAuthenticationFailed);
  });
});
