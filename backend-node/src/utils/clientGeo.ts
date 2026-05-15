import { IncomingHttpHeaders } from 'http';
import { IGeolocation } from '../models/player.model';

const readHeader = (h: IncomingHttpHeaders, name: string): string | undefined => {
  const raw = h[name];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * Construye una `IGeolocation` opcional a partir de los headers
 * `X-Client-Lat`, `X-Client-Lng`, `X-Client-City`, `X-Client-Country`
 * que añade el frontend cuando el navegador devuelve geolocalización.
 *
 * - Si lat o lng faltan o no parsean a número → devuelve `null` (no se
 *   guarda geo a medias).
 * - city/country son opcionales y solo se añaden si vienen no-vacíos.
 */
export const parseClientGeo = (h: IncomingHttpHeaders): IGeolocation | null => {
  const latRaw = readHeader(h, 'x-client-lat');
  const lngRaw = readHeader(h, 'x-client-lng');
  if (!latRaw || !lngRaw) return null;

  const lat = Number.parseFloat(latRaw);
  const lng = Number.parseFloat(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))   return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const geo: IGeolocation = { lat, lng };
  const city    = readHeader(h, 'x-client-city');
  const country = readHeader(h, 'x-client-country');
  if (city)    geo.city    = city;
  if (country) geo.country = country;
  return geo;
};
