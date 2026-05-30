import { Request, Response, NextFunction } from 'express';
import { incrementRequestCounter } from '../services/status.service';

/**
 * Suma 1 al contador en memoria por cada request al backend. Lo lee el
 * panel `/status`. Resetea en cada reinicio del proceso (no persiste).
 */
export const countRequest = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  incrementRequestCounter();
  next();
};
