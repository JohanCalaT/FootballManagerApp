export const VALID_FORMATIONS = [
  '4-4-2', '4-5-1', '4-3-3', '4-3-2-1',
  '4-1-3-2', '5-4-1', '4-1-2-1-2', '3-5-2',
  '5-3-2', '4-2-3-1', '3-4-3', '3-2-4-1',
  'WM', '2-3-2-3', '4-2-4',
] as const;

export type Formation = typeof VALID_FORMATIONS[number];

export const isValidFormation = (f: unknown): f is Formation =>
  typeof f === 'string' && (VALID_FORMATIONS as readonly string[]).includes(f);

export const FORMATIONS_JOINED = VALID_FORMATIONS.join(', ');
