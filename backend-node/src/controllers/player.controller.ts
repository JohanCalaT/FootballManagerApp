import { Request, Response, NextFunction } from 'express';
import * as playerService from '../services/player.service';
import {
  ApiResponse, created, multiStatus, ok, paged,
} from '../utils/apiResponse';
import { buildPagedLinks, buildPlayerLinks } from '../utils/hateoas';
import { parseClientGeo } from '../utils/clientGeo';
import { ImageSource, PlayerPosition } from '../models/player.model';
import { ApiFootballError } from '../errors/apiFootball.errors';

// Body de POST /api/players — el validator ya garantizó las restricciones
// cuando llega aquí, así que tipamos la forma esperada.
interface CreatePlayerBody {
  name:           string;
  team:           string;
  league:         string;
  firstName?:     string;
  lastName?:      string;
  nationality?:   string;
  birthDate?:     string;        // ISO
  birthPlace?:    string;
  birthCountry?:  string;
  height?:        string;
  weight?:        string;
  injured?:       boolean;
  position?:      PlayerPosition;
  shirtNumber?:   number;
  imageUrl?:      string;
  imageSource?:   ImageSource;
  apiFootballId?: number;
}

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

export const create = async (
  req: Request<Record<string, never>, unknown, CreatePlayerBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body;
    const input: playerService.CreatePlayerInput = {
      name:            body.name,
      team:            body.team,
      league:          body.league,
      createdByUserId: req.userId!, // requireUser garantiza que existe
    };

    if (body.firstName    !== undefined) input.firstName    = body.firstName;
    if (body.lastName     !== undefined) input.lastName     = body.lastName;
    if (body.nationality  !== undefined) input.nationality  = body.nationality;
    if (body.birthDate    !== undefined) input.birthDate    = new Date(body.birthDate);
    if (body.birthPlace   !== undefined) input.birthPlace   = body.birthPlace;
    if (body.birthCountry !== undefined) input.birthCountry = body.birthCountry;
    if (body.height       !== undefined) input.height       = body.height;
    if (body.weight       !== undefined) input.weight       = body.weight;
    if (body.injured      !== undefined) input.injured      = body.injured;
    if (body.position     !== undefined) input.position     = body.position;
    if (body.shirtNumber  !== undefined) input.shirtNumber  = body.shirtNumber;
    if (body.imageUrl     !== undefined) input.imageUrl     = body.imageUrl;
    if (body.imageSource  !== undefined) input.imageSource  = body.imageSource;
    if (body.apiFootballId !== undefined) input.apiFootballId = body.apiFootballId;

    const geo = parseClientGeo(req.headers);
    if (geo) input.clientGeolocation = geo;

    const dto   = await playerService.create(input);
    const links = buildPlayerLinks(dto.id, req.isAdmin);
    const resp  = created(dto, 'Jugador creado', links);

    res.setHeader('Location', `/api/players/${dto.id}`);
    res.status(resp.status).json(resp);
  } catch (err) {
    next(err);
  }
};

/**
 * Selector de status cuando NINGÚN item se importó. Espejo del .NET
 * `SelectStatus()` del `ImportPlayersHandler`.
 */
const pickFailureStatus = (firstApiError: ApiFootballError | undefined): number =>
  firstApiError?.status ?? 409; // sin error de API ⇒ todos duplicados ⇒ 409

export const importBatch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await playerService.importBatch(
      req.body,
      req.userId!,
      parseClientGeo(req.headers) ?? undefined,
    );

    if (result.failed.length === 0) {
      const resp = created(
        result,
        `${result.imported.length} jugador(es) importado(s)`,
      );
      res.status(resp.status).json(resp);
      return;
    }

    if (result.imported.length > 0) {
      const resp = multiStatus(
        result,
        `${result.imported.length} importados, ${result.failed.length} con error`,
      );
      res.status(resp.status).json(resp);
      return;
    }

    // Todos fallaron — status según el primer error de API (o 409 si solo dupes)
    const status = pickFailureStatus(result.firstApiError);
    const resp: ApiResponse<playerService.ImportResult> = {
      status,
      message: result.firstApiError?.message ?? 'Ninguno importado (duplicados)',
      data:    result,
      _links:  {},
    };
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
