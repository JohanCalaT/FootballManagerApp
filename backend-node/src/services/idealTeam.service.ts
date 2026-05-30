import * as playerRepo from '../repositories/player.repository';
import * as geminiService from './gemini.service';
import { buildIdealTeamPrompt } from './idealTeamPrompt';
import {
  isValidFormation, FORMATIONS_JOINED,
} from '../utils/idealTeamFormations';
import {
  GeminiUnavailableError, ValidationError,
} from '../errors/domain.errors';

export interface IdealTeamPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  x: number;
  y: number;
  reason: string;
  // FUT-scale attributes (0..99) emitted by Gemini (GK -> DIV/HAN/KIC/REF/SPD/POS).
  overall: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  // Enriched from the database by id after parsing (never trusted from Gemini).
  imageUrl?: string | null;
  nationality?: string | null;
}

export interface IdealTeamResponse {
  formation: string;
  goalkeeper: IdealTeamPlayer;
  defenders: IdealTeamPlayer[];
  midfielders: IdealTeamPlayer[];
  attackers: IdealTeamPlayer[];
  generalJustification: string;
}

export const generateIdealTeam = async (
  formation: unknown,
  _userId: string,
): Promise<IdealTeamResponse> => {
  if (!isValidFormation(formation))
    throw new ValidationError(
      `Formación inválida. Valores permitidos: ${FORMATIONS_JOINED}`);

  const players = await playerRepo.getAllForIdealTeam();
  if (players.length < 11)
    throw new ValidationError('No hay jugadores suficientes (mínimo 11)');

  // No validamos por línea — el prompt indica a Gemini que adapte jugadores
  // de posición similar (regla 5). Una lista vacía aparece como "(ninguno)"
  // en el prompt; Gemini se encargará de improvisar.
  const byLine = new Map<string, playerRepo.PlayerForPromptDto[]>();
  for (const p of players) {
    const list = byLine.get(p.position) ?? [];
    list.push(p);
    byLine.set(p.position, list);
  }

  const gks  = byLine.get('Goalkeeper') ?? [];
  const defs = byLine.get('Defender')   ?? [];
  const mids = byLine.get('Midfielder') ?? [];
  const atts = byLine.get('Attacker')   ?? [];

  // Portero obligatorio: sin porteros en BD no se forma equipo.
  if (gks.length === 0)
    throw new ValidationError('No hay porteros disponibles para formar el equipo');

  const prompt = buildIdealTeamPrompt(formation, gks, defs, mids, atts);
  const raw    = await geminiService.generateIdealTeam(prompt);

  let parsed: IdealTeamResponse;
  try {
    parsed = JSON.parse(raw) as IdealTeamResponse;
  } catch {
    throw new GeminiUnavailableError('Gemini returned malformed JSON');
  }

  if (!isWellShaped(parsed))
    throw new GeminiUnavailableError('Gemini response shape unexpected');

  // La salida debe ser un once completo (1 portero + 10 de campo).
  const total = 1 + parsed.defenders.length
    + parsed.midfielders.length + parsed.attackers.length;
  if (total !== 11)
    throw new GeminiUnavailableError(`Gemini returned ${total} players, expected 11`);

  // Validar IDs contra la BD y enriquecer con datos reales.
  const meta = new Map(players.map((p) => [p.id, p]));
  for (const p of allPlayers(parsed)) {
    if (!meta.has(p.id))
      throw new GeminiUnavailableError(`Gemini returned unknown player id: ${p.id}`);
  }

  const enrich = (p: IdealTeamPlayer): IdealTeamPlayer => {
    const m = meta.get(p.id);
    return {
      ...p,
      overall: clamp99(p.overall),
      pac: clamp99(p.pac),
      sho: clamp99(p.sho),
      pas: clamp99(p.pas),
      dri: clamp99(p.dri),
      def: clamp99(p.def),
      phy: clamp99(p.phy),
      imageUrl: m?.imageUrl ?? null,
      nationality: m?.nationality ?? null,
    };
  };

  return {
    ...parsed,
    goalkeeper: enrich(parsed.goalkeeper),
    defenders: parsed.defenders.map(enrich),
    midfielders: parsed.midfielders.map(enrich),
    attackers: parsed.attackers.map(enrich),
  };
};

const clamp99 = (n: number): number =>
  Math.max(0, Math.min(99, Math.round(n)));

const isWellShaped = (x: unknown): x is IdealTeamResponse => {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r.formation === 'string'
    && typeof r.generalJustification === 'string'
    && isPlayer(r.goalkeeper)
    && Array.isArray(r.defenders)   && r.defenders.every(isPlayer)
    && Array.isArray(r.midfielders) && r.midfielders.every(isPlayer)
    && Array.isArray(r.attackers)   && r.attackers.every(isPlayer);
};

const isPlayer = (x: unknown): x is IdealTeamPlayer => {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Record<string, unknown>;
  return typeof p.id === 'string'
    && typeof p.name === 'string'
    && typeof p.team === 'string'
    && typeof p.position === 'string'
    && typeof p.x === 'number'
    && typeof p.y === 'number'
    && typeof p.reason === 'string'
    && typeof p.overall === 'number'
    && typeof p.pac === 'number'
    && typeof p.sho === 'number'
    && typeof p.pas === 'number'
    && typeof p.dri === 'number'
    && typeof p.def === 'number'
    && typeof p.phy === 'number';
};

const allPlayers = (t: IdealTeamResponse): IdealTeamPlayer[] =>
  [t.goalkeeper, ...t.defenders, ...t.midfielders, ...t.attackers];
