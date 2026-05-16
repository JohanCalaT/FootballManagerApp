import { Types } from 'mongoose';
import {
  IPlayer, IComment, IPlayerStatistics, IGeolocation,
  PlayerPosition, ImageSource,
} from '../models/player.model';

// ─────────────── DTOs salida ───────────────

export interface PlayerListItemDto {
  id: string;
  apiFootballId: number | null;
  name: string;
  team: string;
  league: string;
  position: PlayerPosition | null;
  imageUrl: string | null;
  rating: number | null;       // mejor rating entre statistics, o null
  registeredAt: Date;
}

export interface CommentDto {
  id: string;
  author: string;
  text: string;
  rating: number;
  createdAt: Date;
  createdByUserId: string | null;
  clientGeolocation: IGeolocation | null;
}

export interface PlayerStatisticsDto {
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
  position: string | null;
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

export interface PlayerDetailDto {
  id: string;
  apiFootballId: number | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  birthDate: Date | null;
  birthPlace: string | null;
  birthCountry: string | null;
  height: string | null;
  weight: string | null;
  injured: boolean;
  team: string;
  league: string;
  position: PlayerPosition | null;
  shirtNumber: number | null;
  imageUrl: string | null;
  imageSource: ImageSource | null;
  registeredAt: Date;
  createdByUserId: string;
  clientGeolocation: IGeolocation | null;
  playerGeolocation: IGeolocation | null;
  statistics: PlayerStatisticsDto[];
  comments: CommentDto[];
}

// ─────────────── Mappers ───────────────

const toId = (raw: unknown): string => {
  if (raw instanceof Types.ObjectId) return raw.toString();
  if (typeof raw === 'string') return raw;
  return String(raw);
};

const bestRating = (stats: IPlayerStatistics[]): number | null => {
  const ratings = stats
    .map((s) => s.rating)
    .filter((r): r is number => typeof r === 'number' && Number.isFinite(r));
  return ratings.length === 0 ? null : Math.max(...ratings);
};

export const toListItemDto = (p: IPlayer): PlayerListItemDto => ({
  id:            toId(p._id),
  apiFootballId: p.apiFootballId ?? null,
  name:          p.name,
  team:          p.team,
  league:        p.league,
  position:      p.position ?? null,
  imageUrl:      p.imageUrl ?? null,
  rating:        bestRating(p.statistics ?? []),
  registeredAt:  p.registeredAt,
});

export const toCommentDto = (c: IComment): CommentDto => ({
  id:                c._id ? toId(c._id) : '',
  author:            c.author,
  text:              c.text,
  rating:            c.rating,
  createdAt:         c.createdAt,
  createdByUserId:   c.createdByUserId ?? null,
  clientGeolocation: c.clientGeolocation ?? null,
});

const toStatsDto = (s: IPlayerStatistics): PlayerStatisticsDto => ({
  season:           s.season,
  leagueId:         s.leagueId        ?? null,
  leagueName:       s.leagueName      ?? null,
  leagueCountry:    s.leagueCountry   ?? null,
  leagueLogo:       s.leagueLogo      ?? null,
  teamId:           s.teamId          ?? null,
  teamName:         s.teamName        ?? null,
  teamLogo:         s.teamLogo        ?? null,
  appearances:      s.appearances     ?? 0,
  lineups:          s.lineups         ?? 0,
  minutesPlayed:    s.minutesPlayed   ?? 0,
  position:         s.position        ?? null,
  rating:           s.rating          ?? null,
  captain:          s.captain         ?? false,
  substitutesIn:    s.substitutesIn   ?? 0,
  substitutesOut:   s.substitutesOut  ?? 0,
  substitutesBench: s.substitutesBench ?? 0,
  shotsTotal:       s.shotsTotal      ?? 0,
  shotsOnTarget:    s.shotsOnTarget   ?? 0,
  goals:            s.goals           ?? 0,
  goalsConceded:    s.goalsConceded   ?? 0,
  assists:          s.assists         ?? 0,
  goalsSaved:       s.goalsSaved      ?? 0,
  passesTotal:      s.passesTotal     ?? 0,
  passesKey:        s.passesKey       ?? 0,
  passesAccuracy:   s.passesAccuracy  ?? 0,
  tacklesTotal:     s.tacklesTotal    ?? 0,
  tacklesBlocks:    s.tacklesBlocks   ?? 0,
  interceptions:    s.interceptions   ?? 0,
  duelsTotal:       s.duelsTotal      ?? 0,
  duelsWon:         s.duelsWon        ?? 0,
  dribblesAttempts: s.dribblesAttempts ?? 0,
  dribblesSuccess:  s.dribblesSuccess ?? 0,
  foulsDrawn:       s.foulsDrawn      ?? 0,
  foulsCommitted:   s.foulsCommitted  ?? 0,
  yellowCards:      s.yellowCards     ?? 0,
  yellowRedCards:   s.yellowRedCards  ?? 0,
  redCards:         s.redCards        ?? 0,
  penaltyScored:    s.penaltyScored   ?? 0,
  penaltyMissed:    s.penaltyMissed   ?? 0,
  penaltySaved:     s.penaltySaved    ?? 0,
});

export const toDetailDto = (p: IPlayer): PlayerDetailDto => ({
  id:                toId(p._id),
  apiFootballId:     p.apiFootballId ?? null,
  name:              p.name,
  firstName:         p.firstName    ?? null,
  lastName:          p.lastName     ?? null,
  nationality:       p.nationality  ?? null,
  birthDate:         p.birthDate    ?? null,
  birthPlace:        p.birthPlace   ?? null,
  birthCountry:      p.birthCountry ?? null,
  height:            p.height       ?? null,
  weight:            p.weight       ?? null,
  injured:           p.injured,
  team:              p.team,
  league:            p.league,
  position:          p.position     ?? null,
  shirtNumber:       p.shirtNumber  ?? null,
  imageUrl:          p.imageUrl     ?? null,
  imageSource:       p.imageSource  ?? null,
  registeredAt:      p.registeredAt,
  createdByUserId:   p.createdByUserId,
  clientGeolocation: p.clientGeolocation ?? null,
  playerGeolocation: p.playerGeolocation ?? null,
  statistics:        (p.statistics ?? []).map(toStatsDto),
  comments:          (p.comments   ?? []).map(toCommentDto),
});
