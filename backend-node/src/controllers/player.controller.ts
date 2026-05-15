import { Request, Response, NextFunction } from 'express';
import * as playerService from '../services/player.service';
import { ok, paged } from '../utils/apiResponse';
import { buildPagedLinks, buildPlayerLinks } from '../utils/hateoas';

export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = playerService.normalizePaging(
      req.query.page,
      req.query.limit,
    );
    const result = await playerService.list(page, limit);

    const links = buildPagedLinks('/api/players', result.page, result.limit, result.total);
    const message = result.total === 0 ? 'No hay jugadores' : 'OK';
    const resp = paged(result.items, result.page, result.limit, result.total, message, links);

    res.status(resp.status).json(resp);
  } catch (err) {
    next(err);
  }
};

export const search = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = playerService.normalizePaging(
      req.query.page,
      req.query.limit,
    );
    const criteria = playerService.normalizeSearch(req.query);
    const result = await playerService.search(criteria, page, limit);

    // Arrastra los filtros activos a los links de paginación para que
    // `next`/`prev` mantengan el contexto de búsqueda.
    const linkExtras: Record<string, string | undefined> = {};
    if (criteria.name)   linkExtras.name   = criteria.name;
    if (criteria.team)   linkExtras.team   = criteria.team;
    if (criteria.league) linkExtras.league = criteria.league;
    if (criteria.from)   linkExtras.from   = criteria.from.toISOString();
    if (criteria.to)     linkExtras.to     = criteria.to.toISOString();

    const links = buildPagedLinks(
      '/api/players/search',
      result.page,
      result.limit,
      result.total,
      linkExtras,
    );
    const message = result.total === 0 ? 'Sin resultados' : 'OK';
    const resp = paged(result.items, result.page, result.limit, result.total, message, links);

    res.status(resp.status).json(resp);
  } catch (err) {
    next(err);
  }
};

export const getById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto   = await playerService.getById(req.params.id);
    const links = buildPlayerLinks(dto.id, req.isAdmin);
    const resp  = ok(dto, 'OK', links);
    res.status(resp.status).json(resp);
  } catch (err) {
    next(err);
  }
};
