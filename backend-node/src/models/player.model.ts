import { Document } from 'mongoose';
import { IComment } from './comment.model';

export interface IPlayer extends Document {
  apiFootballId: number;
  name: string;
  team: string;
  comments: IComment[];
}
