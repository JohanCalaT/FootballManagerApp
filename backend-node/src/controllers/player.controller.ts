import { Request, Response, NextFunction } from 'express';
import { PlayerService } from '../services/player.service';

export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  public getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ message: 'Players OK' });
    } catch (error) {
      next(error);
    }
  };
}
