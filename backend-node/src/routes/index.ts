import { Router, Request, Response } from 'express';
import playerRoutes from './player.routes';
import commentRoutes from './comment.routes';

const router = Router();

router.use('/api/players',  playerRoutes);
router.use('/api/comments', commentRoutes);

// View Route (panel de estado — matrícula TRWM) — completar en Sesión 8
router.get('/status', (_req: Request, res: Response) => {
  res.render('status', { title: 'Panel de Estado' });
});

export default router;
