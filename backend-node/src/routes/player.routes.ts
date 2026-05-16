import { Router } from 'express';
import { body } from 'express-validator';
import * as playerController from '../controllers/player.controller';
import { requireAdmin, requireUser } from '../middleware/auth.middleware';
import { runValidations } from '../middleware/validate.middleware';

const router = Router();

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'] as const;
const IMAGE_SOURCES = ['blob', 'api', 'url'] as const;

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
 */
// ⚠️ /search debe registrarse ANTES que /:id — si no, Express captura
// "search" como :id y nunca llega aquí.
router.get('/search', playerController.search);

/**
 * @swagger
 * /api/players:
 *   post:
 *     summary: Crea un jugador manual (sin importar desde API-Football)
 *     security:
 *       - XUserId: []
 *     responses:
 *       201: { description: ApiResponse<PlayerDetailDto> + Location header }
 *       400: { description: Body inválido }
 *       401: { description: Falta X-User-Id }
 *       409: { description: Ya existe un Player con mismo name+team (case-insensitive) }
 */
router.post(
  '/',
  requireUser,
  body('name')          .isString().trim().isLength({ min: 1, max: 100 })
                        .withMessage('debe ser string [1, 100]'),
  body('team')          .isString().trim().isLength({ min: 1, max: 100 })
                        .withMessage('debe ser string [1, 100]'),
  body('league')        .isString().trim().isLength({ min: 1, max: 100 })
                        .withMessage('debe ser string [1, 100]'),
  body('firstName')     .optional().isString().isLength({ max: 100 }),
  body('lastName')      .optional().isString().isLength({ max: 100 }),
  body('nationality')   .optional().isString().isLength({ max: 100 }),
  body('birthDate')     .optional().isISO8601().withMessage('debe ser ISO 8601'),
  body('birthPlace')    .optional().isString().isLength({ max: 100 }),
  body('birthCountry')  .optional().isString().isLength({ max: 100 }),
  body('height')        .optional().isString().isLength({ max: 20 }),
  body('weight')        .optional().isString().isLength({ max: 20 }),
  body('injured')       .optional().isBoolean().toBoolean(),
  body('position')      .optional().isIn(POSITIONS)
                        .withMessage(`debe estar en ${POSITIONS.join('|')}`),
  body('shirtNumber')   .optional().isInt({ min: 1, max: 99 }).toInt(),
  body('imageUrl')      .optional().isString().isLength({ max: 500 }),
  body('imageSource')   .optional().isIn(IMAGE_SOURCES)
                        .withMessage(`debe estar en ${IMAGE_SOURCES.join('|')}`),
  body('apiFootballId') .optional().isInt({ min: 1 }).toInt(),
  runValidations,
  playerController.create,
);

/**
 * @swagger
 * /api/players/import:
 *   post:
 *     summary: Importa jugadores desde API-Football (batch <= 10)
 *     security:
 *       - XUserId: []
 *     responses:
 *       201: { description: Todos importados }
 *       207: { description: Mix éxito/error }
 *       400: { description: Validación local (cap > 10, season inválida) }
 *       401: { description: Falta X-User-Id }
 *       409: { description: Todos duplicados (sin error de API) }
 *       422: { description: Temporada no disponible en API-Football }
 *       502: { description: Error upstream de API-Football }
 *       503: { description: Rate limit o cuota diaria agotada }
 *       504: { description: Timeout API-Football }
 */
// Body es un array — la validación profunda vive en service.validateBatch.
// express-validator no es ideal para arrays heterogéneos; lo hacemos a mano.
router.post('/import', requireUser, playerController.importBatch);

/**
 * @swagger
 * /api/players/{id}:
 *   get:
 *     summary: Detalle de jugador con statistics y comments embebidos
 */
router.get('/:id', playerController.getById);

/**
 * @swagger
 * /api/players/{id}:
 *   put:
 *     summary: Actualiza un jugador (admin)
 *     security:
 *       - XUserId: []
 *       - XUserAdmin: []
 *     responses:
 *       200: { description: ApiResponse<PlayerDetailDto> }
 *       400: { description: Body inválido }
 *       403: { description: Falta X-User-Admin true }
 *       404: { description: No encontrado }
 */
router.put(
  '/:id',
  requireAdmin,
  body('name')          .optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('team')          .optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('league')        .optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('firstName')     .optional().isString().isLength({ max: 100 }),
  body('lastName')      .optional().isString().isLength({ max: 100 }),
  body('nationality')   .optional().isString().isLength({ max: 100 }),
  body('birthDate')     .optional().isISO8601(),
  body('birthPlace')    .optional().isString().isLength({ max: 100 }),
  body('birthCountry')  .optional().isString().isLength({ max: 100 }),
  body('height')        .optional().isString().isLength({ max: 20 }),
  body('weight')        .optional().isString().isLength({ max: 20 }),
  body('injured')       .optional().isBoolean().toBoolean(),
  body('position')      .optional().isIn(POSITIONS),
  body('shirtNumber')   .optional().isInt({ min: 1, max: 99 }).toInt(),
  body('imageUrl')      .optional().isString().isLength({ max: 500 }),
  body('imageSource')   .optional().isIn(IMAGE_SOURCES),
  body('playerGeolocation.lat').optional().isFloat({ min: -90,  max: 90  }),
  body('playerGeolocation.lng').optional().isFloat({ min: -180, max: 180 }),
  body('playerGeolocation.city')   .optional().isString().isLength({ max: 100 }),
  body('playerGeolocation.country').optional().isString().isLength({ max: 100 }),
  runValidations,
  playerController.update,
);

/**
 * @swagger
 * /api/players/{id}:
 *   delete:
 *     summary: Borra un jugador (admin, idempotente)
 *     security:
 *       - XUserId: []
 *       - XUserAdmin: []
 *     responses:
 *       204: { description: Borrado o no existía (idempotente) }
 *       403: { description: Falta X-User-Admin true }
 */
router.delete('/:id', requireAdmin, playerController.remove);

export default router;
