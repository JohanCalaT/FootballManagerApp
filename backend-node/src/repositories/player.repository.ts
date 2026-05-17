import { Types } from 'mongoose';
import { PlayerModel, IPlayer, IComment, IGeolocation } from '../models/player.model';

// Mongoose 9 ya no exporta FilterQuery — usamos un Record genérico. La query
// se valida por Mongoose en runtime contra el schema (campos desconocidos los
// ignora con strict: true).
export type PlayerFilter = Record<string, unknown>;

export interface PagedQuery {
  page: number;
  limit: number;
  filter?: PlayerFilter;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export const findPaged = async (
  { page, limit, filter = {} }: PagedQuery,
): Promise<PagedResult<IPlayer>> => {
  const skip = Math.max(0, (page - 1) * limit);
  const [items, total] = await Promise.all([
    PlayerModel.find(filter)
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IPlayer[]>()
      .exec(),
    PlayerModel.countDocuments(filter).exec(),
  ]);
  return { items, total };
};

export const findById = async (id: string): Promise<IPlayer | null> => {
  if (!Types.ObjectId.isValid(id)) return null;
  return PlayerModel.findById(id).lean<IPlayer>().exec();
};

/**
 * Soft uniqueness lookup para jugadores manuales (sin `apiFootballId`).
 * Compara `name + team` con collation `strength: 1` — primary level:
 * ignora MAYÚSCULAS y acentos. Así "Pedri González" colisiona con
 * "pedri gonzalez" o "PEDRI GONZÁLEZ", que es lo que el usuario espera.
 */
export const findIdByNameAndTeam = async (
  name: string,
  team: string,
): Promise<string | null> => {
  const doc = await PlayerModel.findOne({ name, team })
    .collation({ locale: 'en', strength: 1 })
    .select('_id')
    .lean<{ _id: Types.ObjectId }>()
    .exec();
  return doc ? doc._id.toString() : null;
};

/**
 * Crea el documento. Mongoose aplica defaults y validators del schema.
 * No comprueba soft-uniqueness — eso lo hace el service antes de llamar.
 */
export const create = async (
  input: Record<string, unknown>,
): Promise<IPlayer> => {
  const doc = await PlayerModel.create(input);
  return doc.toObject() as IPlayer;
};

/**
 * ¿Hay ya un Player importado con este (apiFootballId, season)?
 * Útil antes de pegarle a API-Football para no gastar cuota en duplicados.
 */
/**
 * Update parcial. `runValidators: true` aplica los validators del schema
 * sobre los campos modificados (enum position, lengths, etc.).
 * Devuelve `null` si el id no existe o no es un ObjectId válido.
 */
export const update = async (
  id: string,
  patch: Record<string, unknown>,
): Promise<IPlayer | null> => {
  if (!Types.ObjectId.isValid(id)) return null;
  return PlayerModel.findByIdAndUpdate(id, patch, {
    returnDocument: 'after',
    runValidators: true,
  }).lean<IPlayer>().exec();
};

/**
 * Borrado físico. Devuelve `true` si efectivamente borró algo,
 * `false` si el documento no existía. El controller usa esto solo
 * para logging — DELETE responde 204 en ambos casos (idempotente).
 */
export const deleteById = async (id: string): Promise<boolean> => {
  if (!Types.ObjectId.isValid(id)) return false;
  const res = await PlayerModel.findByIdAndDelete(id).lean().exec();
  return res !== null;
};

// ─────────────── Comments anidados ───────────────

export const findCommentsOf = async (
  playerId: string,
): Promise<IComment[] | null> => {
  if (!Types.ObjectId.isValid(playerId)) return null;
  const doc = await PlayerModel.findById(playerId)
    .select('comments')
    .lean<{ comments: IComment[] }>()
    .exec();
  return doc ? doc.comments : null;
};

export interface NewCommentInput {
  author:           string;
  text:             string;
  rating:           number;
  createdByUserId?: string;
  clientGeolocation?: IGeolocation;
}

/**
 * `$push` un comment al array embebido. Devuelve el sub-documento creado
 * (el último del array tras el push) o `null` si el player no existe.
 */
export const addComment = async (
  playerId: string,
  input: NewCommentInput,
): Promise<IComment | null> => {
  if (!Types.ObjectId.isValid(playerId)) return null;
  const updated = await PlayerModel.findByIdAndUpdate(
    playerId,
    { $push: { comments: { ...input, createdAt: new Date() } } },
    { returnDocument: 'after', runValidators: true },
  ).lean<{ comments: IComment[] }>().exec();
  if (!updated) return null;
  // El nuevo siempre es el último tras $push
  return updated.comments[updated.comments.length - 1] ?? null;
};

/**
 * `$pull` un comment por su `_id`. Devuelve `true` si efectivamente
 * borró algo, `false` si no había un comment con ese id en ningún player.
 * El controller responde 204 en ambos casos (idempotente).
 */
export const removeComment = async (commentId: string): Promise<boolean> => {
  if (!Types.ObjectId.isValid(commentId)) return false;
  const objId = new Types.ObjectId(commentId);
  const res = await PlayerModel.updateOne(
    { 'comments._id': objId },
    { $pull: { comments: { _id: objId } } },
  ).exec();
  return res.modifiedCount > 0;
};

export const existsByApiFootballAndSeason = async (
  apiFootballId: number,
  season: number,
): Promise<boolean> => {
  const count = await PlayerModel.countDocuments({
    apiFootballId,
    'statistics.season': season,
  }).exec();
  return count > 0;
};

// ─────────────── Ideal Team — proyección agregada ───────────────

export interface PlayerForPromptDto {
  id: string;
  name: string;
  team: string;
  position: string;
  averageRating: number | null;
  totalGoals: number;
  totalAssists: number;
  totalAppearances: number;
  totalTackles: number;
  totalSaves: number;
  hasStatistics: boolean;
}

/**
 * Proyección plana de cada Player + agregados de su array statistics[].
 * El service usa esto para construir el prompt de Gemini.
 *
 * Los paths apuntan a campos planos del sub-schema (goals, assists,
 * appearances, tacklesTotal, goalsSaved) — 1:1 con PlayerStatistics
 * de EF Core. No usar paths anidados como goals.total.
 */
export const getAllForIdealTeam = async (): Promise<PlayerForPromptDto[]> =>
  PlayerModel.aggregate<PlayerForPromptDto>([
    {
      $project: {
        _id:      0,
        id:       { $toString: '$_id' },
        name:     1,
        team:     1,
        position: { $ifNull: ['$position', 'Unknown'] },
        hasStatistics: {
          $gt: [{ $size: { $ifNull: ['$statistics', []] } }, 0],
        },
        averageRating: {
          $avg: {
            $filter: {
              input: '$statistics.rating',
              as:    'r',
              cond:  { $ne: ['$$r', null] },
            },
          },
        },
        totalGoals:       { $sum: '$statistics.goals' },
        totalAssists:     { $sum: '$statistics.assists' },
        totalAppearances: { $sum: '$statistics.appearances' },
        totalTackles:     { $sum: '$statistics.tacklesTotal' },
        totalSaves:       { $sum: '$statistics.goalsSaved' },
      },
    },
  ]).exec();
