/**
 * Constantes compartidas — alineadas conceptualmente con
 * `FootballManagerApp.Shared/Constants/ApiFootballSeasons.cs` del .NET.
 */
export const VALID_SEASONS = [2022, 2023, 2024] as const;
export type ValidSeason = typeof VALID_SEASONS[number];

export const isValidSeason = (s: number): s is ValidSeason =>
  (VALID_SEASONS as readonly number[]).includes(s);

/**
 * Límite del payload en `POST /api/players/import`. Alineado con el
 * rate-limit por minuto (10 req/min) de API-Football plan free.
 */
export const MAX_ITEMS_PER_BATCH = 10;
