/**
 * Parsers para los campos "raros" del JSON de API-Football v3.
 * Espejo de `Players.Infrastructure/ExternalServices/ApiFootball/ApiFootballParsers.cs`.
 */

/** "170 cm" / "67 kg" → se guarda tal cual (Player.height/weight son string?). */
export const cleanLabel = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

/**
 * "8.103125" → 8.10. La API SIEMPRE usa '.' como separador decimal
 * (Number.parseFloat lo soporta). Redondea a 2 cifras.
 */
export const parseRating = (raw?: string | number | null): number | undefined => {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const v = typeof raw === 'number' ? raw : Number.parseFloat(raw);
  if (!Number.isFinite(v)) return undefined;
  return Math.round(v * 100) / 100;
};

/** "1987-06-24" → Date | undefined. Solo acepta formato YYYY-MM-DD. */
export const parseBirthDate = (raw?: string | null): Date | undefined => {
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
