import { Geolocation } from './geolocation.model';
import { HateoasLinks } from './hateoas-link.model';

export interface Comment {
  id: string;
  /**
   * Optional because the Node backend nests comments inside the player
   * document and does not echo the playerId in the comment DTO (it lives
   * in the parent). The .NET backend, being a separate microservice with
   * its own table, always returns it. The detail page can infer the id
   * from the URL when missing, so callers shouldn't rely on it.
   */
  playerId?: string;
  author: string;
  text: string;
  rating: number;
  createdAt: string;
  createdByUserId: string | null;
  clientGeolocation: Geolocation | null;
  _links?: HateoasLinks;
}

export interface CreateCommentRequest {
  author: string;
  text: string;
  rating: number;
  clientGeolocation?: Geolocation | null;
}
