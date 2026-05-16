import { Router } from 'express';
import { body } from 'express-validator';
import * as commentController from '../controllers/comment.controller';
import { requireAdmin, requireUser } from '../middleware/auth.middleware';
import { runValidations } from '../middleware/validate.middleware';

const router = Router();

/**
 * @swagger
 * /api/comments/player/{playerId}:
 *   get:
 *     summary: Lista de comments embebidos del jugador
 *     responses:
 *       200: { description: ApiResponse<CommentDto[]> }
 *       404: { description: Player no encontrado }
 */
router.get('/player/:playerId', commentController.getByPlayer);

/**
 * @swagger
 * /api/comments/player/{playerId}:
 *   post:
 *     summary: Añade un comment al array embebido del jugador
 *     security:
 *       - XUserId: []
 *     responses:
 *       201: { description: ApiResponse<CommentDto> + Location header }
 *       400: { description: Body inválido (text > 1000, rating fuera de 0..5) }
 *       401: { description: Falta X-User-Id }
 *       404: { description: Player no encontrado }
 */
router.post(
  '/player/:playerId',
  requireUser,
  body('author').isString().trim().isLength({ min: 1, max: 100 })
                .withMessage('debe ser string [1, 100]'),
  body('text')  .isString().isLength({ min: 1, max: 1000 })
                .withMessage('debe ser string [1, 1000]'),
  body('rating').isInt({ min: 0, max: 5 }).toInt()
                .withMessage('debe ser entero [0, 5]'),
  runValidations,
  commentController.create,
);

/**
 * @swagger
 * /api/comments/{commentId}:
 *   delete:
 *     summary: Borra un comment del array embebido (admin, idempotente)
 *     security:
 *       - XUserId: []
 *       - XUserAdmin: []
 *     responses:
 *       204: { description: Borrado o no existía }
 *       403: { description: Falta X-User-Admin true }
 */
router.delete('/:commentId', requireAdmin, commentController.remove);

export default router;
