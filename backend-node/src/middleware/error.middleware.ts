import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../errors/domain.errors';
import {
  ApiResponse, badRequest, conflict, serverError,
} from '../utils/apiResponse';

/**
 * Único productor de 500. Mapea errores tipados a ApiResponse + status.
 * Express 5 reconoce error middlewares por su firma de 4 argumentos.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // 1) Errores de dominio tipados — status viene en la clase
  if (err instanceof DomainError) {
    const resp: ApiResponse<null> = {
      status: err.status,
      message: err.message,
      data: null,
      _links: {},
    };
    res.status(resp.status).json(resp);
    return;
  }

  // 2) Mongoose ValidationError → 400
  if (isNamedError(err, 'ValidationError')) {
    const resp = badRequest(`Validación: ${err.message}`);
    res.status(resp.status).json(resp);
    return;
  }

  // 3) Mongoose CastError (ObjectId inválido, etc.) → 400
  if (isNamedError(err, 'CastError')) {
    const resp = badRequest('Identificador inválido');
    res.status(resp.status).json(resp);
    return;
  }

  // 4) Mongo duplicate key (E11000) → 409
  if (isDuplicateKey(err)) {
    const resp = conflict('Recurso duplicado');
    res.status(resp.status).json(resp);
    return;
  }

  // 5) Fallback — esto es lo que produce 500 en toda la app
  console.error('[errorHandler] uncaught:', err);
  const resp = serverError();
  res.status(resp.status).json(resp);
};

const isNamedError = (
  e: unknown,
  name: string,
): e is Error => e instanceof Error && e.name === name;

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === 'object' && e !== null
  && (e as { code?: number }).code === 11000;
