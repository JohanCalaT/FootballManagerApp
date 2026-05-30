import { Request, Response, NextFunction } from 'express';
import * as playerService from '../services/player.service';
import { created, ok } from '../utils/apiResponse';
import { parseClientGeo } from '../utils/clientGeo';

interface CreateCommentBody {
  author: string;
  text:   string;
  rating: number;
  /**
   * Nested geolocation — preferred shape the frontend sends. When absent,
   * the controller falls back to the legacy X-Client-* headers so a curl
   * that uses headers still works.
   */
  clientGeolocation?: { lat: number; lng: number; city?: string; country?: string };
}

export const getByPlayer = async (
  req: Request<{ playerId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const comments = await playerService.listCommentsOf(req.params.playerId);
    const resp = ok(comments, comments.length === 0 ? 'Sin comentarios' : 'OK');
    res.status(resp.status).json(resp);
  } catch (err) {
    next(err);
  }
};

export const create = async (
  req: Request<{ playerId: string }, unknown, CreateCommentBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input: playerService.AddCommentInput = {
      author:          req.body.author,
      text:            req.body.text,
      rating:          req.body.rating,
      createdByUserId: req.userId!, // requireUser garantiza que existe
    };
    // Body wins over headers — the Angular frontend sends nested
    // clientGeolocation. The header fallback stays for backwards compat
    // with any curl/Postman script that still uses the old contract.
    const body = req.body.clientGeolocation;
    if (body && Number.isFinite(body.lat) && Number.isFinite(body.lng)) {
      input.clientGeolocation = {
        lat: body.lat,
        lng: body.lng,
        ...(body.city !== undefined && { city: body.city }),
        ...(body.country !== undefined && { country: body.country }),
      };
    } else {
      const geo = parseClientGeo(req.headers);
      if (geo) input.clientGeolocation = geo;
    }

    const dto  = await playerService.addComment(req.params.playerId, input);
    const resp = created(dto, 'Comentario añadido');

    res.setHeader('Location', `/api/comments/${dto.id}`);
    res.status(resp.status).json(resp);
  } catch (err) {
    next(err);
  }
};

export const remove = async (
  req: Request<{ commentId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await playerService.removeComment(req.params.commentId);
    // Idempotente — 204 igual exista o no
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
