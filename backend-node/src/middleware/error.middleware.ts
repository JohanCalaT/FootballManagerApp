import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error | unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[Error]:', message);
  res.status(500).json({ error: 'Internal Server Error' });
};
