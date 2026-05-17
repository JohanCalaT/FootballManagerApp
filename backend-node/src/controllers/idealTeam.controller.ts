import { Request, Response, NextFunction } from 'express';
import * as idealTeamService from '../services/idealTeam.service';
import { ok } from '../utils/apiResponse';

export const generate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { formation } = req.body as { formation?: unknown };
    const data = await idealTeamService.generateIdealTeam(
      formation, req.userId as string);
    const resp = ok(data, 'Equipo Ideal generado correctamente', {
      self: { href: '/api/ideal-team', rel: 'self', method: 'POST' },
    });
    res.status(resp.status).json(resp);
  } catch (err) {
    next(err);
  }
};
