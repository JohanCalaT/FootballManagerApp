import { Router, Request, Response } from 'express';
import playerRoutes from './player.routes';
import commentRoutes from './comment.routes';

const router = Router();

// API Routes
router.use('/api/players', playerRoutes);
// Nested routes setup for comments
router.use('/api/players/:id/comments', commentRoutes);

// View Route
router.get('/status', (req: Request, res: Response) => {
  res.render('status', { title: 'Panel de Estado' });
});

export default router;
