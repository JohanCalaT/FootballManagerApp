import * as repo from '../repositories/player.repository';
import * as apiFootball from './apiFootball.service';
import { DuplicatePlayerError, PlayerNotFoundError, ValidationError } from '../errors/domain.errors';
import {
  ApiFootballDailyQuotaExceeded, ApiFootballError, ApiFootballRateLimited,
} from '../errors/apiFootball.errors';
import {
  PlayerDetailDto, PlayerListItemDto,
  toDetailDto, toListItemDto,
} from '../dtos/player.dto';
import { escapeRegex } from '../utils/escapeRegex';
import {
  cleanLabel, parseBirthDate, parseRating,
} from '../utils/apiFootballParser';
import {
  IGeolocation, ImageSource, PlayerPosition,
} from '../models/player.model';
import {
  isValidSeason, MAX_ITEMS_PER_BATCH, VALID_SEASONS,
} from '../config/constants';

const MIN_PAGE = 1;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export const normalizePaging = (
  rawPage: unknown,
  rawLimit: unknown,
): { page: number; limit: number } => {
  const parsedPage  = Number.parseInt(String(rawPage  ?? DEFAULT_PAGE),  10);
  const parsedLimit = Number.parseInt(String(rawLimit ?? DEFAULT_LIMIT), 10);
  const page  = Number.isFinite(parsedPage)  && parsedPage  >= MIN_PAGE  ? parsedPage  : DEFAULT_PAGE;
  const limit = Number.isFinite(parsedLimit) && parsedLimit >= MIN_LIMIT
    ? Math.min(parsedLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;
  return { page, limit };
};

export interface PagedListResult {
  items: PlayerListItemDto[];
  page: number;
  limit: number;
  total: number;
}

export const list = async (
  page: number,
  limit: number,
): Promise<PagedListResult> => {
  const { items, total } = await repo.findPaged({ page, limit });
  return {
    items: items.map(toListItemDto),
    page,
    limit,
    total,
  };
};

export const getById = async (id: string): Promise<PlayerDetailDto> => {
  const doc = await repo.findById(id);
  if (!doc) throw new PlayerNotFoundError(id);
  return toDetailDto(doc);
};

// ─────────────── Búsqueda ───────────────

export interface SearchCriteria {
  name?: string;
  team?: string;
  league?: string;
  from?: Date;
  to?: Date;
}

const parseIsoDate = (raw: unknown): Date | undefined => {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const cleanString = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

/**
 * Normaliza los query params `name | team | league | from | to` a un
 * `SearchCriteria` tipado. Strings vacíos y fechas inválidas se descartan
 * silenciosamente (la búsqueda es pública y permisiva).
 */
export const normalizeSearch = (q: Record<string, unknown>): SearchCriteria => {
  const out: SearchCriteria = {};
  const name   = cleanString(q.name);   if (name   !== undefined) out.name   = name;
  const team   = cleanString(q.team);   if (team   !== undefined) out.team   = team;
  const league = cleanString(q.league); if (league !== undefined) out.league = league;
  const from   = parseIsoDate(q.from);  if (from   !== undefined) out.from   = from;
  const to     = parseIsoDate(q.to);    if (to     !== undefined) out.to     = to;
  return out;
};

const buildFilter = (c: SearchCriteria): repo.PlayerFilter => {
  const filter: repo.PlayerFilter = {};
  if (c.name)   filter.name   = new RegExp(escapeRegex(c.name),   'i');
  if (c.team)   filter.team   = new RegExp(escapeRegex(c.team),   'i');
  if (c.league) filter.league = new RegExp(escapeRegex(c.league), 'i');
  if (c.from || c.to) {
    const range: Record<string, Date> = {};
    if (c.from) range.$gte = c.from;
    if (c.to)   range.$lte = c.to;
    filter.registeredAt = range;
  }
  return filter;
};

// ─────────────── Create (manual) ───────────────

export interface CreatePlayerInput {
  // requeridos
  name:            string;
  team:            string;
  league:          string;
  createdByUserId: string; // de X-User-Id, no del body

  // opcionales
  firstName?:    string;
  lastName?:     string;
  nationality?:  string;
  birthDate?:    Date;
  birthPlace?:   string;
  birthCountry?: string;
  height?:       string;
  weight?:       string;
  injured?:      boolean;
  position?:     PlayerPosition;
  shirtNumber?:  number;
  imageUrl?:     string;
  imageSource?:  ImageSource;
  apiFootballId?: number;

  clientGeolocation?: IGeolocation;
}

export const create = async (input: CreatePlayerInput): Promise<PlayerDetailDto> => {
  // Soft-uniqueness solo para jugadores manuales (sin apiFootballId).
  // Los importados desde API-Football se protegen con el UNIQUE filtrado.
  if (input.apiFootballId === undefined) {
    const existingId = await repo.findIdByNameAndTeam(
      input.name.trim(),
      input.team.trim(),
    );
    if (existingId) {
      throw new DuplicatePlayerError(
        `Ya existe un jugador '${input.name}' en '${input.team}' (id=${existingId}). ` +
        `Modifícalo o créalo en otro equipo.`,
      );
    }
  }

  // Mongoose ignora `undefined` y aplica defaults — pasamos el input tal cual
  // tras un trim de strings críticos.
  const doc = await repo.create({
    ...input,
    name:   input.name.trim(),
    team:   input.team.trim(),
    league: input.league.trim(),
  });
  return toDetailDto(doc);
};

// ─────────────── Import batch desde API-Football ───────────────

export interface ImportItem  { apiFootballId: number; season: number; }
export interface ImportFailure {
  apiFootballId: number;
  season:        number;
  reason:        string;
}
export interface ImportResult {
  imported: PlayerListItemDto[];
  failed:   ImportFailure[];
  /** El PRIMER error de API-Football encontrado (usado para elegir status). */
  firstApiError?: ApiFootballError;
}

const POSITION_SET = new Set<string>(['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']);
const normalizePosition = (raw: string | undefined): PlayerPosition | undefined => {
  const clean = cleanLabel(raw);
  return clean && POSITION_SET.has(clean) ? (clean as PlayerPosition) : undefined;
};

const buildPlayerFromApi = (
  data: apiFootball.ApiFootballPlayerStatsResponse,
  apiFootballId: number,
  userId: string,
  clientGeo: IGeolocation | undefined,
): Record<string, unknown> => {
  // statistics garantizado no vacío cuando results > 0; primary = primer item
  const primary = data.statistics[0]!;
  const profile = data.player;

  const player: Record<string, unknown> = {
    apiFootballId,
    name:            profile.name,
    team:            primary.team.name,
    league:          primary.league.name,
    createdByUserId: userId,
    imageSource:     'api' satisfies ImageSource,
  };

  if (profile.firstname)    player.firstName    = profile.firstname;
  if (profile.lastname)     player.lastName     = profile.lastname;
  if (profile.nationality)  player.nationality  = profile.nationality;
  if (profile.birth?.place)   player.birthPlace   = profile.birth.place;
  if (profile.birth?.country) player.birthCountry = profile.birth.country;
  const birthDate = parseBirthDate(profile.birth?.date);
  if (birthDate) player.birthDate = birthDate;
  const height = cleanLabel(profile.height); if (height) player.height = height;
  const weight = cleanLabel(profile.weight); if (weight) player.weight = weight;
  if (typeof profile.injured === 'boolean') player.injured = profile.injured;
  const position = normalizePosition(profile.position);
  if (position) player.position = position;
  if (typeof profile.number === 'number') player.shirtNumber = profile.number;
  if (profile.photo) player.imageUrl = profile.photo;
  if (clientGeo)     player.clientGeolocation = clientGeo;

  player.statistics = data.statistics.map((s) => ({
    season:           s.league.season,
    leagueId:         s.league.id,
    leagueName:       s.league.name,
    leagueCountry:    s.league.country,
    leagueLogo:       s.league.logo,
    teamId:           s.team.id,
    teamName:         s.team.name,
    teamLogo:         s.team.logo,
    appearances:      s.games?.appearences ?? 0,
    lineups:          s.games?.lineups     ?? 0,
    minutesPlayed:    s.games?.minutes     ?? 0,
    position:         s.games?.position,
    rating:           parseRating(s.games?.rating),
    captain:          s.games?.captain ?? false,
    substitutesIn:    s.substitutes?.in    ?? 0,
    substitutesOut:   s.substitutes?.out   ?? 0,
    substitutesBench: s.substitutes?.bench ?? 0,
    shotsTotal:       s.shots?.total ?? 0,
    shotsOnTarget:    s.shots?.on    ?? 0,
    goals:            s.goals?.total    ?? 0,
    goalsConceded:    s.goals?.conceded ?? 0,
    assists:          s.goals?.assists  ?? 0,
    goalsSaved:       s.goals?.saves    ?? 0,
    passesTotal:      s.passes?.total    ?? 0,
    passesKey:        s.passes?.key      ?? 0,
    passesAccuracy:   s.passes?.accuracy ?? 0,
    tacklesTotal:     s.tackles?.total         ?? 0,
    tacklesBlocks:    s.tackles?.blocks        ?? 0,
    interceptions:    s.tackles?.interceptions ?? 0,
    duelsTotal:       s.duels?.total ?? 0,
    duelsWon:         s.duels?.won   ?? 0,
    dribblesAttempts: s.dribbles?.attempts ?? 0,
    dribblesSuccess:  s.dribbles?.success  ?? 0,
    foulsDrawn:       s.fouls?.drawn     ?? 0,
    foulsCommitted:   s.fouls?.committed ?? 0,
    yellowCards:      s.cards?.yellow    ?? 0,
    yellowRedCards:   s.cards?.yellowred ?? 0,
    redCards:         s.cards?.red       ?? 0,
    penaltyScored:    s.penalty?.scored ?? 0,
    penaltyMissed:    s.penalty?.missed ?? 0,
    penaltySaved:     s.penalty?.saved  ?? 0,
  }));

  return player;
};

const validateBatch = (items: unknown): ImportItem[] => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Debes enviar al menos un { apiFootballId, season }');
  }
  if (items.length > MAX_ITEMS_PER_BATCH) {
    throw new ValidationError(
      `Máximo ${MAX_ITEMS_PER_BATCH} jugadores por petición (alineado con el rate-limit ` +
      `por minuto de API-Football). Recibidos: ${items.length}`,
    );
  }

  const out: ImportItem[] = [];
  for (const [idx, item] of items.entries()) {
    if (!item || typeof item !== 'object') {
      throw new ValidationError(`Item ${idx}: debe ser un objeto`);
    }
    const obj = item as Record<string, unknown>;
    const apiFootballId = typeof obj.apiFootballId === 'number' ? obj.apiFootballId : NaN;
    const season        = typeof obj.season        === 'number' ? obj.season        : NaN;
    if (!Number.isInteger(apiFootballId) || apiFootballId <= 0) {
      throw new ValidationError(`Item ${idx}: apiFootballId inválido (${obj.apiFootballId})`);
    }
    if (!isValidSeason(season)) {
      throw new ValidationError(
        `Item ${idx}: temporada inválida (${obj.season}). Usa ${VALID_SEASONS.join(', ')}`,
      );
    }
    out.push({ apiFootballId, season });
  }
  return out;
};

export const importBatch = async (
  rawItems: unknown,
  userId: string,
  clientGeo: IGeolocation | undefined,
): Promise<ImportResult> => {
  // 1) Validación local — cero llamadas si algo está mal
  const items = validateBatch(rawItems);

  // 2) Procesar en serie con abort-on-rate-limit
  const result: ImportResult = { imported: [], failed: [] };
  let aborted = false;

  for (const it of items) {
    if (aborted) {
      result.failed.push({ ...it, reason: 'Skipped — batch detenido tras rate-limit' });
      continue;
    }
    if (await repo.existsByApiFootballAndSeason(it.apiFootballId, it.season)) {
      result.failed.push({ ...it, reason: 'Ya importado' });
      continue;
    }
    try {
      const data = await apiFootball.getPlayerWithStats(it.apiFootballId, it.season);
      if (!data || data.statistics.length === 0) {
        result.failed.push({ ...it, reason: `sin datos para ${it.season}` });
        continue;
      }
      const doc = await repo.create(buildPlayerFromApi(data, it.apiFootballId, userId, clientGeo));
      result.imported.push(toListItemDto(doc));
    } catch (err) {
      if (err instanceof ApiFootballError) {
        result.failed.push({ ...it, reason: err.message });
        if (!result.firstApiError) result.firstApiError = err;
        if (err instanceof ApiFootballRateLimited || err instanceof ApiFootballDailyQuotaExceeded) {
          aborted = true;
        }
      } else if (err instanceof Error) {
        result.failed.push({ ...it, reason: err.message });
      } else {
        result.failed.push({ ...it, reason: 'Error desconocido' });
      }
    }
  }
  return result;
};

export const search = async (
  criteria: SearchCriteria,
  page: number,
  limit: number,
): Promise<PagedListResult> => {
  const filter = buildFilter(criteria);
  const { items, total } = await repo.findPaged({ page, limit, filter });
  return {
    items: items.map(toListItemDto),
    page,
    limit,
    total,
  };
};
