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
