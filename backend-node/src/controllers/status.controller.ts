import { Request, Response, NextFunction } from 'express';
import { getStatusMetrics } from '../services/status.service';

export const renderStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await getStatusMetrics();
    res.render('status', data);
  } catch (err) {
    next(err);
  }
};
