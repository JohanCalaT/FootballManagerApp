import { Player } from './player.model';

/**
 * Lightweight profile returned by `GET /api/players/search-external`.
 *
 * Mirrors the .NET `ApiFootballProfileSummary` record (see
 * `FootballManagerApp.Players.Application/Common/DTOs/ApiFootballDtos.cs`)
 * and the Node response shape — both backends normalize the upstream
 * API-Football payload to this contract.
 *
 * The `apiFootballId` field is the primary handle the import endpoint
 * expects in its request body, paired with a `season` chosen from the
 * free-plan window (2022-2024).
 */
export interface ApiFootballProfile {
  apiFootballId: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  birthCountry: string | null;
  height: string | null;
  weight: string | null;
  shirtNumber: number | null;
  position: string | null;
  photo: string | null;
}

/** Per-row failure entry returned in the import response payload. */
export interface ImportFailure {
  apiFootballId: number;
  season: number;
  reason: string;
}

/**
 * Full payload of `POST /api/players/import` regardless of overall status
 * (201, 207, or 4xx/5xx with a partial result). `imported` may be empty if
 * everything failed, and `failed` may be empty if everything succeeded.
 */
export interface ImportResult {
  imported: Player[];
  failed: ImportFailure[];
}

/**
 * The three API-Football seasons the project supports under the free plan.
 * Mirrors `FootballManagerApp.Shared/Constants/ApiFootballSeasons.cs`.
 * Sorted descending so the frontend can pick `[0]` as the default season
 * after intersecting with what API-Football exposes for a given player.
 */
export const FREE_PLAN_SEASONS = [2024, 2023, 2022] as const;
export type FreePlanSeason = (typeof FREE_PLAN_SEASONS)[number];
