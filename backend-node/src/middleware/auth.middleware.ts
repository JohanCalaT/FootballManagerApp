import { Request, Response, NextFunction } from 'express';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Stub for Firebase auth
  next();
};
