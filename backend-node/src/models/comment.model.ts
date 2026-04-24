import { Document } from 'mongoose';

export interface IComment extends Document {
  userUid: string;
  text: string;
  createdAt: Date;
}
