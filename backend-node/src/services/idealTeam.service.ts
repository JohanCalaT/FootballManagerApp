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

  if (gks.length  === 0) throw new ValidationError('No hay porteros disponibles');
  if (defs.length === 0) throw new ValidationError('No hay defensas disponibles');
  if (mids.length === 0) throw new ValidationError('No hay centrocampistas disponibles');
  if (atts.length === 0) throw new ValidationError('No hay delanteros disponibles');

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

  const knownIds = new Set(players.map((p) => p.id));
  for (const p of allPlayers(parsed)) {
    if (!knownIds.has(p.id))
      throw new GeminiUnavailableError(`Gemini returned unknown player id: ${p.id}`);
  }

  return parsed;
};

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
    && typeof p.reason === 'string';
};

const allPlayers = (t: IdealTeamResponse): IdealTeamPlayer[] =>
  [t.goalkeeper, ...t.defenders, ...t.midfielders, ...t.attackers];
