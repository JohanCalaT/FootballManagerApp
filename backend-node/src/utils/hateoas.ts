import { Links } from './apiResponse';

const buildQuery = (params: Record<string, string | number | undefined>): string => {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length ? `?${entries.join('&')}` : '';
};

/**
 * Links para `GET /api/players/:id`. Si `isAdmin` se añaden `update` y `delete`.
 */
export const buildPlayerLinks = (playerId: string, isAdmin: boolean): Links => {
  const links: Links = {
    self:       { href: `/api/players/${playerId}`,             rel: 'self',       method: 'GET' },
    collection: { href: `/api/players`,                          rel: 'collection', method: 'GET' },
    comments:   { href: `/api/comments/player/${playerId}`,     rel: 'comments',   method: 'GET' },
  };
  if (isAdmin) {
    links.update = { href: `/api/players/${playerId}`, rel: 'update', method: 'PUT'    };
    links.delete = { href: `/api/players/${playerId}`, rel: 'delete', method: 'DELETE' };
  }
  return links;
};

/**
 * Links de paginación. `extra` permite arrastrar filtros de búsqueda.
 */
export const buildPagedLinks = (
  basePath: string,
  page: number,
  limit: number,
  total: number,
  extra: Record<string, string | number | undefined> = {},
): Links => {
  const pages = limit <= 0 ? 0 : Math.ceil(total / limit);
  const link = (p: number): { href: string; rel: string; method: string } => ({
    href: `${basePath}${buildQuery({ ...extra, page: p, limit })}`,
    rel: '',
    method: 'GET',
  });

  const links: Links = {
    self:  { ...link(page),                            rel: 'self'  },
    first: { ...link(1),                               rel: 'first' },
    last:  { ...link(Math.max(pages, 1)),              rel: 'last'  },
  };
  if (page > 1)     links.prev = { ...link(page - 1), rel: 'prev' };
  if (page < pages) links.next = { ...link(page + 1), rel: 'next' };
  return links;
};
