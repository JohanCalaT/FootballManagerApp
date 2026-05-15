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
