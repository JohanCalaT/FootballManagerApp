import { Geolocation } from './geolocation.model';

export type PlayerPosition = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';
export type ImageSource = 'blob' | 'api' | 'url';

export interface PlayerStatistics {
  id: string;
  season: number;
  leagueId: number | null;
  leagueName: string | null;
  leagueCountry: string | null;
  leagueLogo: string | null;
  teamId: number | null;
  teamName: string | null;
  teamLogo: string | null;
  appearances: number;
  lineups: number;
  minutesPlayed: number;
  position: PlayerPosition | null;
  rating: number | null;
  captain: boolean;
  substitutesIn: number;
  substitutesOut: number;
  substitutesBench: number;
  shotsTotal: number;
  shotsOnTarget: number;
  goals: number;
  goalsConceded: number;
  assists: number;
  goalsSaved: number;
  passesTotal: number;
  passesKey: number;
  passesAccuracy: number;
  tacklesTotal: number;
  tacklesBlocks: number;
  interceptions: number;
  duelsTotal: number;
  duelsWon: number;
  dribblesAttempts: number;
  dribblesSuccess: number;
  foulsDrawn: number;
  foulsCommitted: number;
  yellowCards: number;
  yellowRedCards: number;
  redCards: number;
  penaltyScored: number;
  penaltyMissed: number;
  penaltySaved: number;
}

export interface Player {
  id: string;
  apiFootballId: number | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  birthCountry: string | null;
  height: string | null;
  weight: string | null;
  position: PlayerPosition | null;
  shirtNumber: number | null;
  injured: boolean;
  imageUrl: string | null;
  imageSource: ImageSource | null;
  team: string;
  league: string;
  registeredAt: string;
  createdByUserId: string;
  clientGeolocation: Geolocation | null;
  playerGeolocation: Geolocation | null;
  statistics: PlayerStatistics[];
}

export interface CreatePlayerRequest {
  apiFootballId?: number | null;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  nationality?: string | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  birthCountry?: string | null;
  height?: string | null;
  weight?: string | null;
  position?: PlayerPosition | null;
  shirtNumber?: number | null;
  injured?: boolean;
  imageUrl?: string | null;
  imageSource?: ImageSource | null;
  team: string;
  league: string;
  clientGeolocation?: Geolocation | null;
  playerGeolocation?: Geolocation | null;
}

export type UpdatePlayerRequest = CreatePlayerRequest;

export interface ImportPlayerItem {
  apiFootballId: number;
  season: number;
}

export interface PlayerSearchFilters {
  name?: string;
  team?: string;
  league?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
