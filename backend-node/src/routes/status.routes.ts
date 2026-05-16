import { Router } from 'express';
import { renderStatus } from '../controllers/status.controller';

const router = Router();
router.get('/status', renderStatus);
export default router;
