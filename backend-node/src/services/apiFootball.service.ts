import axios, { AxiosInstance, isAxiosError } from 'axios';
import {
  ApiFootballAuthenticationFailed, ApiFootballDailyQuotaExceeded,
  ApiFootballInvalidParameter, ApiFootballNotFound, ApiFootballRateLimited,
  ApiFootballSeasonNotAvailable, ApiFootballTimeout, ApiFootballUpstreamError,
} from '../errors/apiFootball.errors';
import { VALID_SEASONS } from '../config/constants';
import { getCache } from './cache.service';

/** TTL para `af:player:stats:{id}:{season}` — temporadas finalizadas. */
const STATS_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 días

// ─────────────── Tipos del envelope ───────────────

interface ApiFootballEnvelope<T> {
  get: string;
  errors: Record<string, string> | unknown[];
  results: number;
  paging?: { current: number; total: number };
  response: T[];
}

// ─────────────── DTOs de respuesta — espejo del .NET ───────────────

export interface ApiFootballPlayer {
  id: number;
  name: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  birth?: { date?: string; place?: string; country?: string };
  nationality?: string;
  height?: string;     // "170 cm"
  weight?: string;     // "67 kg"
  number?: number;
  position?: string;
  injured?: boolean;
  photo?: string;
}

export interface ApiFootballStatistics {
  team:        { id: number; name: string; logo?: string };
  league:      { id: number; name: string; country?: string; logo?: string; flag?: string; season: number };
  games?:      { appearences?: number; lineups?: number; minutes?: number; position?: string; rating?: string; captain?: boolean };
  substitutes?: { in?: number; out?: number; bench?: number };
  shots?:      { total?: number; on?: number };
  goals?:      { total?: number; conceded?: number; assists?: number; saves?: number };
  passes?:     { total?: number; key?: number; accuracy?: number };
  tackles?:    { total?: number; blocks?: number; interceptions?: number };
  duels?:      { total?: number; won?: number };
  dribbles?:   { attempts?: number; success?: number };
  fouls?:      { drawn?: number; committed?: number };
  cards?:      { yellow?: number; yellowred?: number; red?: number };
  penalty?:    { scored?: number; missed?: number; commited?: number; saved?: number };
}

export interface ApiFootballPlayerStatsResponse {
  player: ApiFootballPlayer;
  statistics: ApiFootballStatistics[];
}

// ─────────────── Cliente axios (lazy) ───────────────

const BASE_URL = process.env.API_FOOTBALL_URL ?? 'https://v3.football.api-sports.io';
const TIMEOUT_MS = 15_000;

let cachedClient: AxiosInstance | undefined;

const getClient = (): AxiosInstance => {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new ApiFootballAuthenticationFailed();
  }
  cachedClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'x-apisports-key': apiKey },
    timeout: TIMEOUT_MS,
  });
  return cachedClient;
};

/** Solo para tests — fuerza re-creación con el `process.env` actual. */
export const __resetClientForTests = (): void => { cachedClient = undefined; };

// ─────────────── Detección de errores en el body (HTTP 200 ≠ éxito) ───────────────

const ensureNoBodyErrors = (env: ApiFootballEnvelope<unknown>): void => {
  const e = env.errors;
  if (Array.isArray(e) && e.length === 0) return;
  if (typeof e === 'object' && e !== null && !Array.isArray(e) && Object.keys(e).length === 0) return;

  const raw = JSON.stringify(e).toLowerCase();
  if (raw.includes('missing application key') || raw.includes('token'))
    throw new ApiFootballAuthenticationFailed();
  if (raw.includes('request limit for the day'))
    throw new ApiFootballDailyQuotaExceeded();
  if (raw.includes('rate limit') || raw.includes('per minute'))
    throw new ApiFootballRateLimited();
  if (raw.includes('no coverage') || raw.includes('plan does not allow'))
    throw new ApiFootballSeasonNotAvailable(0);
  throw new ApiFootballUpstreamError(200);
};

// ─────────────── Mapeo de errores axios (HTTP no-200 / red) ───────────────

const mapAxiosError = (err: unknown): never => {
  if (!isAxiosError(err)) {
    if (err instanceof Error) throw err;
    throw new ApiFootballUpstreamError();
  }
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT')
    throw new ApiFootballTimeout();
  const status = err.response?.status;
  if (status === 401 || status === 403) throw new ApiFootballAuthenticationFailed();
  if (status === 429) throw new ApiFootballRateLimited();
  if (status === 404) throw new ApiFootballNotFound();
  if (status === 499) throw new ApiFootballSeasonNotAvailable(0);
  throw new ApiFootballUpstreamError(status);
};

// ─────────────── Endpoint 4.3 — stats por jugador + temporada ───────────────

/**
 * `GET /players?id=X&season=Y`. Validación previa estricta para NO gastar
 * cuota si los parámetros son inválidos.
 *
 * - Devuelve `null` si `results: 0` (no es error: el jugador no jugó esa temporada).
 * - Lanza `ApiFootballError.*` para errores reales.
 */
const fetchPlayerWithStatsFromApi = async (
  apiFootballId: number,
  season: number,
): Promise<ApiFootballPlayerStatsResponse | null> => {
  let envelope: ApiFootballEnvelope<ApiFootballPlayerStatsResponse>;
  try {
    const res = await getClient().get<ApiFootballEnvelope<ApiFootballPlayerStatsResponse>>(
      '/players',
      { params: { id: apiFootballId, season } },
    );
    envelope = res.data;
  } catch (err) {
    mapAxiosError(err);
    return null; // inalcanzable — mapAxiosError siempre lanza
  }

  ensureNoBodyErrors(envelope);
  if (envelope.results === 0) return null;
  return envelope.response[0] ?? null;
};

/**
 * Cache-aside sobre `af:player:stats:{id}:{season}` (TTL 30d). Comparte
 * la clave con el backend .NET, así si .NET ya consultó esa combinación
 * el Node no gasta otra petición de la cuota diaria de 100 req/día.
 *
 * `null` (jugador sin datos para esa temporada) NO se cachea — el cache
 * service solo guarda valores no-null. Errores tampoco se cachean
 * (mapAxiosError / ensureNoBodyErrors lanzan antes del set).
 */
export const getPlayerWithStats = async (
  apiFootballId: number,
  season: number,
): Promise<ApiFootballPlayerStatsResponse | null> => {
  if (!Number.isInteger(apiFootballId) || apiFootballId <= 0) {
    throw new ApiFootballInvalidParameter('id');
  }
  if (!(VALID_SEASONS as readonly number[]).includes(season)) {
    throw new ApiFootballSeasonNotAvailable(season);
  }

  const cacheKey = `af:player:stats:${apiFootballId}:${season}`;
  return getCache().getOrSet<ApiFootballPlayerStatsResponse>(
    cacheKey,
    STATS_TTL_SECONDS,
    () => fetchPlayerWithStatsFromApi(apiFootballId, season),
  );
};
