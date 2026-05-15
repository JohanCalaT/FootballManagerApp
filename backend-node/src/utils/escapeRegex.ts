/**
 * Escapa los metacaracteres regex de una cadena antes de meterla en un
 * `new RegExp(...)`. Vital cuando la query viene del usuario: nombres como
 * "O'Connor", "S.A.", "100%" o "x*y" rompen una RegExp si no se escapan.
 */
export const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
