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
 * /api/players/search:
 *   get:
 *     summary: Búsqueda paginada por nombre / equipo / liga / rango de fechas
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: Substring case-insensitive sobre Player.name
 *       - in: query
 *         name: team
 *         schema: { type: string }
 *       - in: query
 *         name: league
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: ISO 8601 — filtra registeredAt >= from
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
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
// ⚠️ /search debe registrarse ANTES que /:id — si no, Express captura
// "search" como :id y nunca llega aquí.
router.get('/search', playerController.search);

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
