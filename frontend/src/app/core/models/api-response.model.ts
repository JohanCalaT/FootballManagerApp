import { HateoasLinks } from './hateoas-link.model';

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T | null;
  _links: HateoasLinks;
}

export interface PagedResponse<T> {
  status: number;
  message: string;
  data: T[];
  page: number;
  limit: number;
  total: number;
  _links: HateoasLinks;
}

export function hasLink<T>(
  res: ApiResponse<T> | PagedResponse<T> | undefined | null,
  rel: string,
): boolean {
  return !!res?._links?.[rel];
}

export function getLink<T>(
  res: ApiResponse<T> | PagedResponse<T> | undefined | null,
  rel: string,
): string | null {
  return res?._links?.[rel]?.href ?? null;
}
