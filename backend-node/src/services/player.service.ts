import * as repo from '../repositories/player.repository';
import { DuplicatePlayerError, PlayerNotFoundError } from '../errors/domain.errors';
import {
  PlayerDetailDto, PlayerListItemDto,
  toDetailDto, toListItemDto,
} from '../dtos/player.dto';
import { escapeRegex } from '../utils/escapeRegex';
import {
  IGeolocation, ImageSource, PlayerPosition,
} from '../models/player.model';

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
