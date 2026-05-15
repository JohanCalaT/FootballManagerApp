import * as repo from '../repositories/player.repository';
import { PlayerNotFoundError } from '../errors/domain.errors';
import {
  PlayerDetailDto, PlayerListItemDto,
  toDetailDto, toListItemDto,
} from '../dtos/player.dto';

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
