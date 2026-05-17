import { Router } from 'express';
import { body } from 'express-validator';
import { runValidations } from '../middleware/validate.middleware';
import { requireUser } from '../middleware/auth.middleware';
import { VALID_FORMATIONS } from '../utils/idealTeamFormations';
import * as ctrl from '../controllers/idealTeam.controller';

const router = Router();

/**
 * @swagger
 * /api/ideal-team:
 *   post:
 *     tags: [IdealTeam]
 *     summary: Genera el once ideal en la formación pedida vía Gemini
 *     description: >
 *       Toma todos los jugadores de la BD (≥11), construye el prompt y
 *       delega la composición táctica a Google Gemini. La respuesta agrupa
 *       los jugadores por línea (goalkeeper / defenders / midfielders /
 *       attackers) con coordenadas `x`,`y` ∈ [0..1] para pintarlos en el
 *       campo. Las posiciones específicas (GK, CB, LB, CM, ST, etc.) las
 *       elige Gemini según la formación.
 *     security:
 *       - XUserId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [formation]
 *             properties:
 *               formation:
 *                 type: string
 *                 enum:
 *                   - 4-4-2
 *                   - 4-5-1
 *                   - 4-3-3
 *                   - 4-3-2-1
 *                   - 4-1-3-2
 *                   - 5-4-1
 *                   - 4-1-2-1-2
 *                   - 3-5-2
 *                   - 5-3-2
 *                   - 4-2-3-1
 *                   - 3-4-3
 *                   - 3-2-4-1
 *                   - WM
 *                   - 2-3-2-3
 *                   - 4-2-4
 *                 example: 4-3-3
 *     responses:
 *       "200":
 *         description: "ApiResponse<IdealTeamResponse> con _links.self"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: integer, example: 200 }
 *                 message: { type: string,  example: "Equipo Ideal generado correctamente" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     formation:            { type: string, example: "4-3-3" }
 *                     goalkeeper:           { $ref: "#/components/schemas/IdealTeamPlayer" }
 *                     defenders:            { type: array, items: { $ref: "#/components/schemas/IdealTeamPlayer" } }
 *                     midfielders:          { type: array, items: { $ref: "#/components/schemas/IdealTeamPlayer" } }
 *                     attackers:            { type: array, items: { $ref: "#/components/schemas/IdealTeamPlayer" } }
 *                     generalJustification: { type: string }
 *                 _links:
 *                   type: object
 *                   properties:
 *                     self:
 *                       type: object
 *                       properties:
 *                         href:   { type: string, example: "/api/ideal-team" }
 *                         rel:    { type: string, example: "self" }
 *                         method: { type: string, example: "POST" }
 *       "400":
 *         description: "Formación inválida o menos de 11 jugadores en BD"
 *       "401":
 *         description: "Falta el header X-User-Id"
 *       "503":
 *         description: "Gemini no disponible (timeout, 5xx, JSON inválido o IDs desconocidos)"
 *
 * components:
 *   schemas:
 *     IdealTeamPlayer:
 *       type: object
 *       properties:
 *         id:       { type: string, format: uuid }
 *         name:     { type: string, example: "Manuel Neuer" }
 *         team:     { type: string, example: "Bayern Munich" }
 *         position:
 *           type: string
 *           description: "Posición fina elegida por Gemini"
 *           enum: [GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST]
 *         x:        { type: number, format: float, minimum: 0, maximum: 1 }
 *         y:        { type: number, format: float, minimum: 0, maximum: 1 }
 *         reason:   { type: string }
 */
router.post('/',
  requireUser,
  body('formation')
    .isString().withMessage('formation must be a string')
    .bail()
    .isIn(VALID_FORMATIONS as unknown as string[])
    .withMessage(`formation must be one of: ${VALID_FORMATIONS.join(', ')}`),
  runValidations,
  ctrl.generate,
);

export default router;
