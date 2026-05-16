import { Types } from 'mongoose';
import { PlayerModel, IPlayer } from '../models/player.model';

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
