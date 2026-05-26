import { Geolocation } from './geolocation.model';

export interface Comment {
  id: string;
  playerId: string;
  author: string;
  text: string;
  rating: number;
  createdAt: string;
  createdByUserId: string | null;
  clientGeolocation: Geolocation | null;
}

export interface CreateCommentRequest {
  author: string;
  text: string;
  rating: number;
  clientGeolocation?: Geolocation | null;
}
