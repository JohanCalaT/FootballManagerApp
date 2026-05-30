/**
 * Errores de dominio tipados. El error.middleware central los mapea a
 * status HTTP + ApiResponse. Cualquier `Error` no clasificado cae a 500.
 */
export abstract class DomainError extends Error {
  abstract readonly status: number;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PlayerNotFoundError extends DomainError {
  readonly status = 404;
  constructor(id: string) {
    super(`Jugador no encontrado (id=${id})`);
  }
}

export class CommentNotFoundError extends DomainError {
  readonly status = 404;
  constructor(id: string) {
    super(`Comentario no encontrado (id=${id})`);
  }
}

export class DuplicatePlayerError extends DomainError {
  readonly status = 409;
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends DomainError {
  readonly status = 400;
  constructor(message: string, public readonly details?: unknown) {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  readonly status = 401;
  constructor(message = 'No autorizado') { super(message); }
}

export class ForbiddenError extends DomainError {
  readonly status = 403;
  constructor(message = 'Sin permisos') { super(message); }
}

/**
 * Lanzada cuando Gemini no responde, devuelve un error HTTP, agota timeout
 * o produce un payload inválido. error.middleware la mapea a HTTP 503.
 */
export class GeminiUnavailableError extends DomainError {
  readonly status = 503;
  constructor(message = 'Servicio Gemini no disponible') { super(message); }
}
