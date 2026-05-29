// Modelos del subsistema de Noticias (CORBA vía adapter REST a través del
// Gateway). El adapter usa un envelope PROPIO `{ status, message, data }` con
// `status` de tipo string ('success' | 'error') — NO es el ApiResponse<T> del
// resto del proyecto (que lleva status numérico + _links). Por eso vive aparte.

export interface Noticia {
  id: string;
  titulo: string; // <= 200
  contenido: string; // <= 5000
  autor: string; // <= 100
  fechaPub: string; // ISO 8601
  imagenUrl?: string; // <= 500
}

export interface CreateNoticiaRequest {
  titulo: string;
  contenido: string;
  autor: string;
  imagenUrl?: string;
}

export interface EstadoServicio {
  totalNoticias: number;
  limiteMaximo: number;
  fechaUltimoReset: string;
}

export interface NewsEnvelope<T> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
}

/** Límites de validación espejados del adapter (NoticiaDto / LimiteDto). */
export const NEWS_LIMITS = {
  titulo: 200,
  contenido: 5000,
  autor: 100,
  imagenUrl: 500,
  maxSizeMin: 1,
  maxSizeMax: 10_000,
} as const;
