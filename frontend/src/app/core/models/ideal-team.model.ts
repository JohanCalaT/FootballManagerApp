export type IdealTeamFormation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';

export type IdealTeamStyle = 'offensive' | 'defensive' | 'balanced';

export interface IdealTeamRequest {
  formation: IdealTeamFormation;
  preferredLeague?: string | null;
  style?: IdealTeamStyle | null;
}

/**
 * One player in the ideal eleven. Mirrors the backend `IdealTeamPlayerDto`
 * (Id/Name/Team/Position/X/Y/Reason) and adds the FUT attributes the AI
 * emits on the 0–99 scale so the <fma-fut-card> can render front + back.
 *
 * `x`/`y` are normalised pitch coordinates: x 0=left → 1=right,
 * y 0=own goal → 1=rival goal.
 */
export interface IdealTeamPlayer {
  id: string;
  name: string;
  team: string;
  /** Fine-grained position: GK | CB | LB | RB | CDM | CM | CAM | LW | RW | ST … */
  position: string;
  x: number;
  y: number;
  reason: string;

  imageUrl?: string | null;
  nationality?: string | null;

  /** FUT 0–99 overall, drives the card tier. */
  overall: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

export interface IdealTeamResponse {
  formation: string;
  goalkeeper: IdealTeamPlayer;
  defenders: IdealTeamPlayer[];
  midfielders: IdealTeamPlayer[];
  attackers: IdealTeamPlayer[];
  generalJustification: string;
}

/** Flattened eleven in pitch-render order (GK first). */
export function flattenIdealTeam(team: IdealTeamResponse): IdealTeamPlayer[] {
  return [
    team.goalkeeper,
    ...team.defenders,
    ...team.midfielders,
    ...team.attackers,
  ];
}
