export interface IdealTeamRequest {
  formation: '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';
  preferredLeague?: string | null;
  budget?: number | null;
  style?: 'offensive' | 'defensive' | 'balanced' | null;
}

export interface IdealTeamSlot {
  position: string;
  playerId: string | null;
  playerName: string;
  reason: string;
}

export interface IdealTeamResponse {
  formation: string;
  slots: IdealTeamSlot[];
  justification: string;
}
