import { Request, Response, NextFunction } from 'express';
import * as playerService from '../services/player.service';
import { created, ok } from '../utils/apiResponse';
import { parseClientGeo } from '../utils/clientGeo';

interface CreateCommentBody {
  author: string;
  text:   string;
  rating: number;
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
    const geo = parseClientGeo(req.headers);
    if (geo) input.clientGeolocation = geo;

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
