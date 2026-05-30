import { Router } from 'express';
import playerRoutes    from './player.routes';
import commentRoutes   from './comment.routes';
import statusRoutes    from './status.routes';
import idealTeamRoutes from './idealTeam.routes';

const router = Router();

router.use('/api/players',     playerRoutes);
router.use('/api/comments',    commentRoutes);
router.use('/api/ideal-team',  idealTeamRoutes);
router.use('/',                statusRoutes); // GET /status (panel Pug — matrícula TRWM)

export default router;
