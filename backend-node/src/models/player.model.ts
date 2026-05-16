import { Schema, model, Document, Types } from 'mongoose';

// ─────────────────── Sub-schemas anidados ───────────────────

const geolocationSchema = new Schema(
  {
    lat:     { type: Number, required: true, min: -90,  max: 90  },
    lng:     { type: Number, required: true, min: -180, max: 180 },
    city:    { type: String, maxlength: 100 },
    country: { type: String, maxlength: 100 },
  },
  { _id: false },
);

const playerStatisticsSchema = new Schema(
  {
    season:        { type: Number, required: true },
    leagueId:      { type: Number },
    leagueName:    { type: String, maxlength: 100 },
    leagueCountry: { type: String, maxlength: 100 },
    leagueLogo:    { type: String, maxlength: 500 },
    teamId:        { type: Number },
    teamName:      { type: String, maxlength: 100 },
    teamLogo:      { type: String, maxlength: 500 },

    appearances:   { type: Number, default: 0 },
    lineups:       { type: Number, default: 0 },
    minutesPlayed: { type: Number, default: 0 },
    position:      { type: String, maxlength: 50 },
    rating:        { type: Number },
    captain:       { type: Boolean, default: false },

    substitutesIn:    { type: Number, default: 0 },
    substitutesOut:   { type: Number, default: 0 },
    substitutesBench: { type: Number, default: 0 },

    shotsTotal:     { type: Number, default: 0 },
    shotsOnTarget:  { type: Number, default: 0 },
    goals:          { type: Number, default: 0 },
    goalsConceded:  { type: Number, default: 0 },
    assists:        { type: Number, default: 0 },
    goalsSaved:     { type: Number, default: 0 },

    passesTotal:    { type: Number, default: 0 },
    passesKey:      { type: Number, default: 0 },
    passesAccuracy: { type: Number, default: 0 },

    tacklesTotal:  { type: Number, default: 0 },
    tacklesBlocks: { type: Number, default: 0 },
    interceptions: { type: Number, default: 0 },

    duelsTotal: { type: Number, default: 0 },
    duelsWon:   { type: Number, default: 0 },

    dribblesAttempts: { type: Number, default: 0 },
    dribblesSuccess:  { type: Number, default: 0 },

    foulsDrawn:     { type: Number, default: 0 },
    foulsCommitted: { type: Number, default: 0 },
    yellowCards:    { type: Number, default: 0 },
    yellowRedCards: { type: Number, default: 0 },
    redCards:       { type: Number, default: 0 },

    penaltyScored: { type: Number, default: 0 },
    penaltyMissed: { type: Number, default: 0 },
    penaltySaved:  { type: Number, default: 0 },
  },
  { _id: false },
);

const commentSchema = new Schema({
  author:            { type: String, required: true, maxlength: 100 },
  text:              { type: String, required: true, maxlength: 1000 },
  rating:            { type: Number, required: true, min: 0, max: 5 },
  createdAt:         { type: Date, default: Date.now },
  createdByUserId:   { type: String, maxlength: 100 },
  clientGeolocation: { type: geolocationSchema, default: undefined },
});
// _id sí queda activo (default Mongoose) — necesario para DELETE /api/comments/:commentId

// ─────────────────── Schema principal Player ───────────────────

const playerSchema = new Schema(
  {
    apiFootballId: { type: Number, default: null },

    name:         { type: String, required: true, maxlength: 100 },
    firstName:    { type: String, maxlength: 100 },
    lastName:     { type: String, maxlength: 100 },
    nationality:  { type: String, maxlength: 100 },
    birthDate:    { type: Date },
    birthPlace:   { type: String, maxlength: 100 },
    birthCountry: { type: String, maxlength: 100 },
    height:       { type: String, maxlength: 20 },
    weight:       { type: String, maxlength: 20 },
    injured:      { type: Boolean, default: false },

    team:   { type: String, required: true, maxlength: 100 },
    league: { type: String, required: true, maxlength: 100 },
    position: {
      type: String,
      enum: ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', null],
      default: null,
    },
    shirtNumber: { type: Number, min: 1, max: 99 },

    imageUrl:    { type: String, maxlength: 500 },
    imageSource: {
      type: String,
      enum: ['blob', 'api', 'url', null],
      default: null,
    },

    registeredAt:    { type: Date, default: Date.now },
    createdByUserId: { type: String, required: true, maxlength: 100 },

    clientGeolocation: { type: geolocationSchema, default: undefined },
    playerGeolocation: { type: geolocationSchema, default: undefined },

    statistics: { type: [playerStatisticsSchema], default: [] },
    comments:   { type: [commentSchema], default: [] },
  },
  {
    timestamps: false,
    strict: true,
    collection: 'players',
    toJSON: { virtuals: true, versionKey: false },
  },
);

// ─────────────────── Índices ───────────────────

// Único filtrado: solo aplica cuando apiFootballId no es null
// MongoDB solo permite operadores limitados en partialFilterExpression
// ($eq, $exists, $gt(e), $lt(e), $type, $and, $or). $ne no está permitido —
// usamos $type: 'number' para que el UNIQUE aplique solo cuando apiFootballId
// es un número (excluye null y campos ausentes).
playerSchema.index(
  { apiFootballId: 1 },
  { unique: true, partialFilterExpression: { apiFootballId: { $type: 'number' } } },
);

// Búsqueda case-insensitive (collation strength 2 ignora mayúsculas y diacríticos)
playerSchema.index({ name: 1 },   { collation: { locale: 'en', strength: 2 } });
playerSchema.index({ team: 1 },   { collation: { locale: 'en', strength: 2 } });
playerSchema.index({ league: 1 }, { collation: { locale: 'en', strength: 2 } });

// Listado paginado por fecha desc
playerSchema.index({ registeredAt: -1 });

// ─────────────────── Interfaces TypeScript ───────────────────

export interface IGeolocation {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
}

export interface IComment {
  _id?: Types.ObjectId;
  author: string;
  text: string;
  rating: number;
  createdAt: Date;
  createdByUserId?: string;
  clientGeolocation?: IGeolocation;
}

export interface IPlayerStatistics {
  season: number;
  leagueId?: number;
  leagueName?: string;
  leagueCountry?: string;
  leagueLogo?: string;
  teamId?: number;
  teamName?: string;
  teamLogo?: string;

  appearances?: number;
  lineups?: number;
  minutesPlayed?: number;
  position?: string;
  rating?: number;
  captain?: boolean;

  substitutesIn?: number;
  substitutesOut?: number;
  substitutesBench?: number;

  shotsTotal?: number;
  shotsOnTarget?: number;
  goals?: number;
  goalsConceded?: number;
  assists?: number;
  goalsSaved?: number;

  passesTotal?: number;
  passesKey?: number;
  passesAccuracy?: number;

  tacklesTotal?: number;
  tacklesBlocks?: number;
  interceptions?: number;

  duelsTotal?: number;
  duelsWon?: number;

  dribblesAttempts?: number;
  dribblesSuccess?: number;

  foulsDrawn?: number;
  foulsCommitted?: number;
  yellowCards?: number;
  yellowRedCards?: number;
  redCards?: number;

  penaltyScored?: number;
  penaltyMissed?: number;
  penaltySaved?: number;
}

export type PlayerPosition = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';
export type ImageSource = 'blob' | 'api' | 'url';

export interface IPlayer extends Document {
  apiFootballId: number | null;
  name: string;
  firstName?: string;
  lastName?: string;
  nationality?: string;
  birthDate?: Date;
  birthPlace?: string;
  birthCountry?: string;
  height?: string;
  weight?: string;
  injured: boolean;
  team: string;
  league: string;
  position: PlayerPosition | null;
  shirtNumber?: number;
  imageUrl?: string;
  imageSource: ImageSource | null;
  registeredAt: Date;
  createdByUserId: string;
  clientGeolocation?: IGeolocation;
  playerGeolocation?: IGeolocation;
  statistics: IPlayerStatistics[];
  comments: IComment[];
}

export const PlayerModel = model<IPlayer>('Player', playerSchema);
