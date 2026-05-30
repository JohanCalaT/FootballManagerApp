import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { badRequest } from '../utils/apiResponse';

/**
 * Middleware terminal de cadenas express-validator. Si hay errores,
 * responde 400 con ApiResponse incluyendo el detalle por campo.
 * Si no hay errores, deja pasar al controller.
 */
export const runValidations = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    next();
    return;
  }
  const errors = result.array().map((e) => ({
    field:   'path' in e ? e.path : 'body',
    message: e.msg,
  }));
  const message = `Validación: ${errors.map((e) => `${e.field} ${e.message}`).join('; ')}`;
  const resp = { ...badRequest(message), errors };
  res.status(resp.status).json(resp);
};
