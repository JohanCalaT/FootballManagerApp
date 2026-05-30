/**
 * Errores de API-Football tipados. Cada subclase sabe a qué HTTP status
 * traducirse cuando ningún item del batch ha tenido éxito (selector del
 * controller). El error.middleware también los reconoce vía `instanceof`.
 */
export abstract class ApiFootballError extends Error {
  abstract readonly status: number;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ApiFootballNotFound extends ApiFootballError {
  readonly status = 404;
  constructor() { super('Jugador no encontrado en API-Football'); }
}

export class ApiFootballInvalidParameter extends ApiFootballError {
  readonly status = 400;
  constructor(param: string) { super(`Parámetro inválido: ${param}`); }
}

export class ApiFootballSeasonNotAvailable extends ApiFootballError {
  readonly status = 422;
  constructor(season: number) {
    super(`Temporada ${season} no disponible. Usa: 2022, 2023 o 2024`);
  }
}

export class ApiFootballAuthenticationFailed extends ApiFootballError {
  readonly status = 500;
  constructor() { super('Error de configuración con API-Football'); }
}

export class ApiFootballRateLimited extends ApiFootballError {
  readonly status = 503;
  constructor() { super('Límite de requests por minuto alcanzado'); }
}

export class ApiFootballDailyQuotaExceeded extends ApiFootballError {
  readonly status = 503;
  constructor() { super('Cuota diaria de API-Football agotada'); }
}

export class ApiFootballUpstreamError extends ApiFootballError {
  readonly status = 502;
  constructor(httpStatus?: number) {
    super(`Error en API-Football (HTTP ${httpStatus ?? '?'})`);
  }
}

export class ApiFootballTimeout extends ApiFootballError {
  readonly status = 504;
  constructor() { super('Timeout al conectar con API-Football'); }
}
