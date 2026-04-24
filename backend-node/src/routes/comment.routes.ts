import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { CommentService } from '../services/comment.service';
import { CommentRepository } from '../repositories/comment.repository';

// mergeParams: true ensures we can access :id from the parent router
const router = Router({ mergeParams: true });
const commentRepo = new CommentRepository();
const commentService = new CommentService(commentRepo);
const commentController = new CommentController(commentService);

/**
 * @swagger
 * /api/players/{id}/comments:
 *   get:
 *     summary: Obtener todos los comentarios de un jugador
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de comentarios
 */
router.get('/', commentController.getAll);

export default router;
