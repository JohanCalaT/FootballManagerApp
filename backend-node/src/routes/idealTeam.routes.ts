import { Router } from 'express';
import { body } from 'express-validator';
import { runValidations } from '../middleware/validate.middleware';
import { requireUser } from '../middleware/auth.middleware';
import { VALID_FORMATIONS } from '../utils/idealTeamFormations';
import * as ctrl from '../controllers/idealTeam.controller';

const router = Router();

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
