import {
  IdealTeamFormation,
  IdealTeamPlayer,
  IdealTeamResponse,
} from '../../core/models/ideal-team.model';

/**
 * Pitch layout — the FRONT owns where each card sits, not the backend.
 *
 * Rationale (coherence): the AI decides *who* plays and *in which line*
 * (goalkeeper / defenders / midfielders / attackers), plus the reason and the
 * FUT attributes. The exact on-pitch coordinates are purely visual and must
 * stay clean, symmetric and responsive, so they live here as a deterministic
 * per-formation template. The `x/y` the backend emits are treated as a hint
 * and ignored for rendering.
 *
 * Assignment is by fine position (CB/LB/CDM/LW/ST…): each slot declares its
 * preferred `role`; players are matched to slots by exact role first, and any
 * leftover players fill the remaining slots in order (so duplicate roles like
 * two CBs resolve left→right by the order the backend returned them).
 *
 * Coordinates: x 0=left → 1=right · y 0=own goal → 1=rival goal.
 */

export interface Slot {
  x: number;
  y: number;
  /** Preferred fine position for matching (GK, CB, LB, CDM, LW, ST, …). */
  role: string;
}

export interface FormationLayout {
  goalkeeper: Slot;
  defenders: Slot[];
  midfielders: Slot[];
  attackers: Slot[];
}

/** A player resolved to a concrete pitch coordinate from the template. */
export interface PlacedPlayer {
  player: IdealTeamPlayer;
  x: number;
  y: number;
}

export const FORMATION_LAYOUTS: Record<IdealTeamFormation, FormationLayout> = {
  '4-3-3': {
    goalkeeper: { x: 0.5, y: 0.06, role: 'GK' },
    defenders: [
      { x: 0.14, y: 0.26, role: 'LB' },
      { x: 0.38, y: 0.2, role: 'CB' },
      { x: 0.62, y: 0.2, role: 'CB' },
      { x: 0.86, y: 0.26, role: 'RB' },
    ],
    midfielders: [
      { x: 0.28, y: 0.5, role: 'CM' },
      { x: 0.5, y: 0.42, role: 'CDM' },
      { x: 0.72, y: 0.5, role: 'CM' },
    ],
    attackers: [
      { x: 0.18, y: 0.78, role: 'LW' },
      { x: 0.5, y: 0.86, role: 'ST' },
      { x: 0.82, y: 0.78, role: 'RW' },
    ],
  },
  '4-4-2': {
    goalkeeper: { x: 0.5, y: 0.06, role: 'GK' },
    defenders: [
      { x: 0.14, y: 0.24, role: 'LB' },
      { x: 0.38, y: 0.2, role: 'CB' },
      { x: 0.62, y: 0.2, role: 'CB' },
      { x: 0.86, y: 0.24, role: 'RB' },
    ],
    midfielders: [
      { x: 0.14, y: 0.54, role: 'LM' },
      { x: 0.4, y: 0.46, role: 'CM' },
      { x: 0.6, y: 0.46, role: 'CM' },
      { x: 0.86, y: 0.54, role: 'RM' },
    ],
    attackers: [
      { x: 0.38, y: 0.82, role: 'ST' },
      { x: 0.62, y: 0.82, role: 'ST' },
    ],
  },
  '3-5-2': {
    goalkeeper: { x: 0.5, y: 0.09, role: 'GK' },
    defenders: [
      { x: 0.26, y: 0.26, role: 'CB' },
      { x: 0.5, y: 0.25, role: 'CB' },
      { x: 0.74, y: 0.26, role: 'CB' },
    ],
    midfielders: [
      { x: 0.09, y: 0.57, role: 'LWB' },
      { x: 0.33, y: 0.56, role: 'CM' },
      { x: 0.5, y: 0.45, role: 'CDM' },
      { x: 0.67, y: 0.56, role: 'CM' },
      { x: 0.91, y: 0.57, role: 'RWB' },
    ],
    attackers: [
      { x: 0.38, y: 0.89, role: 'ST' },
      { x: 0.62, y: 0.89, role: 'ST' },
    ],
  },
  '4-2-3-1': {
    goalkeeper: { x: 0.5, y: 0.06, role: 'GK' },
    defenders: [
      { x: 0.14, y: 0.24, role: 'LB' },
      { x: 0.38, y: 0.2, role: 'CB' },
      { x: 0.62, y: 0.2, role: 'CB' },
      { x: 0.86, y: 0.24, role: 'RB' },
    ],
    midfielders: [
      { x: 0.36, y: 0.4, role: 'CDM' },
      { x: 0.64, y: 0.4, role: 'CDM' },
      { x: 0.18, y: 0.64, role: 'LW' },
      { x: 0.5, y: 0.6, role: 'CAM' },
      { x: 0.82, y: 0.64, role: 'RW' },
    ],
    attackers: [{ x: 0.5, y: 0.86, role: 'ST' }],
  },
};

const samePosition = (a: string, b: string): boolean =>
  a.trim().toUpperCase() === b.trim().toUpperCase();

/**
 * Assign one line's players to its template slots: exact fine-position match
 * first, then fill any empty slot with the next unused player (in order).
 */
function assignLine(
  players: readonly IdealTeamPlayer[],
  slots: readonly Slot[],
): PlacedPlayer[] {
  const used = players.map(() => false);
  const chosen: (number | null)[] = slots.map(() => null);

  // Pass 1 — exact role match (slot order; duplicates resolve in player order).
  slots.forEach((slot, si) => {
    const pi = players.findIndex(
      (p, i) => !used[i] && samePosition(p.position, slot.role),
    );
    if (pi !== -1) {
      used[pi] = true;
      chosen[si] = pi;
    }
  });

  // Pass 2 — fill remaining slots with leftover players, in order.
  slots.forEach((slot, si) => {
    if (chosen[si] === null) {
      const pi = used.findIndex((u) => !u);
      if (pi !== -1) {
        used[pi] = true;
        chosen[si] = pi;
      }
    }
  });

  const placed: PlacedPlayer[] = [];
  slots.forEach((slot, si) => {
    const pi = chosen[si];
    if (pi !== null) placed.push({ player: players[pi], x: slot.x, y: slot.y });
  });
  return placed;
}

/**
 * Resolve the eleven onto the chosen formation's template. Render order is
 * GK → defenders → midfielders → attackers (matches the sequential reveal).
 */
export function placeTeam(
  team: IdealTeamResponse,
  formation: IdealTeamFormation,
): PlacedPlayer[] {
  const layout = FORMATION_LAYOUTS[formation];
  return [
    {
      player: team.goalkeeper,
      x: layout.goalkeeper.x,
      y: layout.goalkeeper.y,
    },
    ...assignLine(team.defenders, layout.defenders),
    ...assignLine(team.midfielders, layout.midfielders),
    ...assignLine(team.attackers, layout.attackers),
  ];
}
