import { Router } from 'express';
import { PlayerController } from '../controllers/player.controller';
import { PlayerService } from '../services/player.service';
import { PlayerRepository } from '../repositories/player.repository';

const router = Router();
const playerRepo = new PlayerRepository();
const playerService = new PlayerService(playerRepo);
const playerController = new PlayerController(playerService);

/**
 * @swagger
 * /api/players:
 *   get:
 *     summary: Obtener todos los jugadores
 *     responses:
 *       200:
 *         description: Lista de jugadores
 */
router.get('/', playerController.getAll);

export default router;
