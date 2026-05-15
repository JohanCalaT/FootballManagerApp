import { Request, Response, NextFunction } from 'express';
import { unauthorized, forbidden } from '../utils/apiResponse';

declare module 'express-serve-static-core' {
  interface Request {
    userId: string | undefined;
    isAdmin: boolean;
  }
}

/**
 * Popula `req.userId` y `req.isAdmin` desde headers reenviados por el Gateway.
 * No bloquea — solo enriquece el contexto. Aplicar globalmente en app.ts.
 */
export const populateAuthContext = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const uid = req.headers['x-user-id'];
  req.userId = typeof uid === 'string' && uid.length > 0 ? uid : undefined;
  const admin = req.headers['x-user-admin'];
  req.isAdmin = typeof admin === 'string' && admin.toLowerCase() === 'true';
  next();
};

export const requireUser = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.userId) {
    const r = unauthorized();
    res.status(r.status).json(r);
    return;
  }
  next();
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.isAdmin) {
    const r = forbidden();
    res.status(r.status).json(r);
    return;
  }
  next();
};
