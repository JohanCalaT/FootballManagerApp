export interface HateoasLink {
  href: string;
  rel: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export type HateoasLinks = Record<string, HateoasLink>;
