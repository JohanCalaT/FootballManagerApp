import { Router } from 'express';
import * as playerController from '../controllers/player.controller';

const router = Router();

/**
 * @swagger
 * /api/players:
 *   get:
 *     summary: Listado paginado de jugadores
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: PagedResponse<PlayerListItemDto>
 */
router.get('/', playerController.getAll);

/**
 * @swagger
 * /api/players/{id}:
 *   get:
 *     summary: Detalle de jugador con statistics y comments embebidos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: ApiResponse<PlayerDetailDto> }
 *       400: { description: id inválido }
 *       404: { description: no encontrado }
 */
router.get('/:id', playerController.getById);

export default router;
