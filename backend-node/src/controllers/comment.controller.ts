import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service';

export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  public getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ message: 'Comments OK' });
    } catch (error) {
      next(error);
    }
  };
}
