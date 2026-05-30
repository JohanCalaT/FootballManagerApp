/**
 * Espejo bit-a-bit del ApiResponse<T> / PagedResponse<T> del backend .NET.
 * Cualquier endpoint debe responder con esta forma para que el toggle del
 * frontend sea transparente.
 */

export type Links = Record<string, { href: string; rel: string; method: string }>;

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T | null;
  _links: Links;
}

export interface PagedResponse<T> {
  status: number;
  message: string;
  data: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  _links: Links;
}

// ─────────────── 2xx ───────────────

export const ok = <T>(
  data: T,
  message = 'OK',
  links: Links = {},
): ApiResponse<T> => ({ status: 200, message, data, _links: links });

export const created = <T>(
  data: T,
  message = 'Creado correctamente',
  links: Links = {},
): ApiResponse<T> => ({ status: 201, message, data, _links: links });

export const noContent = (): ApiResponse<null> => ({
  status: 204, message: 'Sin contenido', data: null, _links: {},
});

export const multiStatus = <T>(
  data: T,
  message: string,
  links: Links = {},
): ApiResponse<T> => ({ status: 207, message, data, _links: links });

// ─────────────── 4xx ───────────────

export const badRequest = (message = 'Solicitud inválida'): ApiResponse<null> => ({
  status: 400, message, data: null, _links: {},
});

export const unauthorized = (
  message = 'No autorizado',
): ApiResponse<null> => ({ status: 401, message, data: null, _links: {} });

export const forbidden = (
  message = 'Sin permisos',
): ApiResponse<null> => ({ status: 403, message, data: null, _links: {} });

export const notFound = (
  message = 'No encontrado',
): ApiResponse<null> => ({ status: 404, message, data: null, _links: {} });

export const conflict = (
  message = 'Conflicto',
): ApiResponse<null> => ({ status: 409, message, data: null, _links: {} });

export const unprocessable = (
  message = 'Entidad no procesable',
): ApiResponse<null> => ({ status: 422, message, data: null, _links: {} });

// ─────────────── 5xx ───────────────

export const serverError = (
  message = 'Error interno',
): ApiResponse<null> => ({ status: 500, message, data: null, _links: {} });

export const badGateway = (
  message = 'Error al conectar con servicio externo',
): ApiResponse<null> => ({ status: 502, message, data: null, _links: {} });

export const serviceUnavailable = (
  message = 'Servicio temporalmente no disponible',
): ApiResponse<null> => ({ status: 503, message, data: null, _links: {} });

export const gatewayTimeout = (
  message = 'Timeout',
): ApiResponse<null> => ({ status: 504, message, data: null, _links: {} });

// ─────────────── Paginado ───────────────

export const paged = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message = 'OK',
  links: Links = {},
): PagedResponse<T> => ({
  status: 200,
  message,
  data,
  page,
  limit,
  total,
  pages: limit <= 0 ? 0 : Math.ceil(total / limit),
  _links: links,
});
