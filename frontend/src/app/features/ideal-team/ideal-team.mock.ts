import {
  IdealTeamFormation,
  IdealTeamPlayer,
  IdealTeamResponse,
} from '../../core/models/ideal-team.model';

/**
 * Hardcoded ideal elevens — one per supported formation — matching the
 * backend `IdealTeamResponseDto` shape plus the FUT attributes the AI emits
 * (0–99 scale). Used while the reveal flow is built design-first; no endpoint
 * is hit in this branch.
 *
 * When the real POST /api/ideal-team lands, the page just swaps
 * `IDEAL_TEAM_MOCKS[formation]` for the service call — the shape is identical.
 *
 * Pitch coordinates: x 0=left → 1=right · y 0=own goal → 1=rival goal.
 */

/** A player's identity + attributes, without the per-formation slot data. */
type PlayerBase = Omit<IdealTeamPlayer, 'id' | 'position' | 'x' | 'y'>;

/** Reusable star pool so the four lineups stay DRY and consistent. */
const POOL = {
  courtois: {
    name: 'Thibaut Courtois', team: 'Real Madrid', nationality: 'Bélgica',
    overall: 89, pac: 86, sho: 85, pas: 74, dri: 90, def: 47, phy: 89,
    reason: 'Reflejos de élite y dominio del área; saque preciso para iniciar la jugada.',
  },
  alisson: {
    name: 'Alisson', team: 'Liverpool', nationality: 'Brasil',
    overall: 89, pac: 85, sho: 86, pas: 78, dri: 89, def: 49, phy: 87,
    reason: 'Seguridad bajo palos y un juego con los pies que da salida limpia.',
  },
  theo: {
    name: 'Theo Hernández', team: 'AC Milan', nationality: 'Francia',
    overall: 85, pac: 94, sho: 71, pas: 80, dri: 84, def: 79, phy: 83,
    reason: 'Carril izquierdo con velocidad y llegada. Defiende y se suma al ataque.',
  },
  davies: {
    name: 'Alphonso Davies', team: 'Bayern Múnich', nationality: 'Canadá',
    overall: 84, pac: 96, sho: 65, pas: 77, dri: 86, def: 78, phy: 82,
    reason: 'Velocidad pura para cubrir toda la banda y arrancar la transición.',
  },
  dias: {
    name: 'Rúben Dias', team: 'Manchester City', nationality: 'Portugal',
    overall: 88, pac: 62, sho: 39, pas: 72, dri: 71, def: 89, phy: 88,
    reason: 'Líder defensivo, lectura impecable y salida limpia de balón.',
  },
  vandijk: {
    name: 'Virgil van Dijk', team: 'Liverpool', nationality: 'Países Bajos',
    overall: 89, pac: 79, sho: 60, pas: 71, dri: 72, def: 90, phy: 86,
    reason: 'Físico dominante y anticipación. Ancla la línea y manda en el aire.',
  },
  saliba: {
    name: 'William Saliba', team: 'Arsenal', nationality: 'Francia',
    overall: 85, pac: 86, sho: 40, pas: 70, dri: 74, def: 86, phy: 84,
    reason: 'Central rápido que defiende líneas altas sin perder solidez.',
  },
  taa: {
    name: 'Trent Alexander-Arnold', team: 'Real Madrid', nationality: 'Inglaterra',
    overall: 86, pac: 76, sho: 72, pas: 90, dri: 80, def: 78, phy: 71,
    reason: 'Distribución de mediocampista desde la banda. Asiste y abre el campo.',
  },
  hakimi: {
    name: 'Achraf Hakimi', team: 'PSG', nationality: 'Marruecos',
    overall: 85, pac: 95, sho: 74, pas: 79, dri: 84, def: 76, phy: 79,
    reason: 'Lateral-extremo que castiga al espacio y desborda por dentro y fuera.',
  },
  kdb: {
    name: 'Kevin De Bruyne', team: 'Napoli', nationality: 'Bélgica',
    overall: 91, pac: 72, sho: 88, pas: 93, dri: 87, def: 64, phy: 78,
    reason: 'El cerebro del equipo. Pase filtrado, disparo lejano y visión total.',
  },
  rodri: {
    name: 'Rodri', team: 'Manchester City', nationality: 'España',
    overall: 90, pac: 66, sho: 78, pas: 87, dri: 84, def: 87, phy: 85,
    reason: 'Ancla del medio campo. Recupera, ordena y dicta el ritmo.',
  },
  bellingham: {
    name: 'Jude Bellingham', team: 'Real Madrid', nationality: 'Inglaterra',
    overall: 88, pac: 80, sho: 84, pas: 84, dri: 87, def: 78, phy: 84,
    reason: 'Box-to-box completo. Llega al área y aporta gol desde segunda línea.',
  },
  valverde: {
    name: 'Federico Valverde', team: 'Real Madrid', nationality: 'Uruguay',
    overall: 88, pac: 88, sho: 83, pas: 85, dri: 85, def: 81, phy: 86,
    reason: 'Motor incansable: corre, recupera y dispara desde fuera del área.',
  },
  vini: {
    name: 'Vinícius Júnior', team: 'Real Madrid', nationality: 'Brasil',
    overall: 90, pac: 95, sho: 84, pas: 79, dri: 93, def: 29, phy: 68,
    reason: 'Desborde puro por la izquierda. Velocidad y regate para romper líneas.',
  },
  salah: {
    name: 'Mohamed Salah', team: 'Liverpool', nationality: 'Egipto',
    overall: 89, pac: 90, sho: 87, pas: 81, dri: 88, def: 45, phy: 75,
    reason: 'Diferencial por la derecha. Recorta hacia dentro y define con frialdad.',
  },
  haaland: {
    name: 'Erling Haaland', team: 'Manchester City', nationality: 'Noruega',
    overall: 91, pac: 89, sho: 93, pas: 66, dri: 80, def: 45, phy: 88,
    reason: 'Definición letal y presencia en el área. El referente goleador.',
  },
  mbappe: {
    name: 'Kylian Mbappé', team: 'Real Madrid', nationality: 'Francia',
    overall: 91, pac: 97, sho: 90, pas: 80, dri: 92, def: 36, phy: 78,
    reason: 'Velocidad y definición de otro nivel; rompe cualquier defensa al espacio.',
  },
  kane: {
    name: 'Harry Kane', team: 'Bayern Múnich', nationality: 'Inglaterra',
    overall: 90, pac: 68, sho: 93, pas: 83, dri: 83, def: 47, phy: 83,
    reason: 'Nueve total: define, asocia y baja a generar juego.',
  },
} satisfies Record<string, PlayerBase>;

/** Place a pooled player into a formation slot. */
const at = (
  base: PlayerBase,
  id: string,
  position: string,
  x: number,
  y: number,
): IdealTeamPlayer => ({ ...base, id, position, x, y });

const FORMATION_4_3_3: IdealTeamResponse = {
  formation: '4-3-3',
  goalkeeper: at(POOL.courtois, 'gk', 'GK', 0.5, 0.06),
  defenders: [
    at(POOL.theo, 'lb', 'LB', 0.14, 0.26),
    at(POOL.dias, 'cb1', 'CB', 0.38, 0.2),
    at(POOL.vandijk, 'cb2', 'CB', 0.62, 0.2),
    at(POOL.taa, 'rb', 'RB', 0.86, 0.26),
  ],
  midfielders: [
    at(POOL.kdb, 'cm1', 'CM', 0.28, 0.5),
    at(POOL.rodri, 'cdm', 'CDM', 0.5, 0.42),
    at(POOL.bellingham, 'cm2', 'CM', 0.72, 0.5),
  ],
  attackers: [
    at(POOL.vini, 'lw', 'LW', 0.18, 0.78),
    at(POOL.haaland, 'st', 'ST', 0.5, 0.86),
    at(POOL.salah, 'rw', 'RW', 0.82, 0.78),
  ],
  generalJustification:
    'Un 4-3-3 equilibrado: defensa sólida con laterales que proyectan, un medio campo que combina recuperación (Rodri) y creación (De Bruyne, Bellingham), y un tridente letal con desborde por bandas y un nueve de referencia.',
};

const FORMATION_4_4_2: IdealTeamResponse = {
  formation: '4-4-2',
  goalkeeper: at(POOL.alisson, 'gk', 'GK', 0.5, 0.06),
  defenders: [
    at(POOL.davies, 'lb', 'LB', 0.14, 0.24),
    at(POOL.dias, 'cb1', 'CB', 0.38, 0.2),
    at(POOL.saliba, 'cb2', 'CB', 0.62, 0.2),
    at(POOL.hakimi, 'rb', 'RB', 0.86, 0.24),
  ],
  midfielders: [
    at(POOL.vini, 'lm', 'LM', 0.14, 0.54),
    at(POOL.kdb, 'cm1', 'CM', 0.4, 0.46),
    at(POOL.bellingham, 'cm2', 'CM', 0.6, 0.46),
    at(POOL.salah, 'rm', 'RM', 0.86, 0.54),
  ],
  attackers: [
    at(POOL.haaland, 'st1', 'ST', 0.38, 0.82),
    at(POOL.mbappe, 'st2', 'ST', 0.62, 0.82),
  ],
  generalJustification:
    'Un 4-4-2 clásico de dos líneas compactas: laterales veloces, dobles centrales contundentes, una banda de cuatro que aporta amplitud y dos delanteros que se complementan en el remate.',
};

const FORMATION_3_5_2: IdealTeamResponse = {
  formation: '3-5-2',
  // Coordinates per the prototype (x, y in % of the pitch, attack up),
  // converted to the model space (x 0..1, y 0=own goal → 1=rival goal):
  // myX = x/100, myY = (100 - y)/100.
  goalkeeper: at(POOL.courtois, 'gk', 'GK', 0.5, 0.09),
  defenders: [
    at(POOL.dias, 'cb1', 'CB', 0.26, 0.26),
    at(POOL.vandijk, 'cb2', 'CB', 0.5, 0.25),
    at(POOL.saliba, 'cb3', 'CB', 0.74, 0.26),
  ],
  midfielders: [
    at(POOL.theo, 'lwb', 'LWB', 0.09, 0.57),
    at(POOL.kdb, 'cm1', 'CM', 0.33, 0.56),
    at(POOL.rodri, 'cdm', 'CDM', 0.5, 0.45),
    at(POOL.bellingham, 'cm2', 'CM', 0.67, 0.56),
    at(POOL.hakimi, 'rwb', 'RWB', 0.91, 0.57),
  ],
  attackers: [
    at(POOL.haaland, 'st1', 'ST', 0.38, 0.89),
    at(POOL.kane, 'st2', 'ST', 0.62, 0.89),
  ],
  generalJustification:
    'Un 3-5-2 con tres centrales que permiten a los carrileros (Theo, Hakimi) volar por las bandas. El doble pivote sostiene a De Bruyne y dos puntas garantizan presencia constante en el área.',
};

const FORMATION_4_2_3_1: IdealTeamResponse = {
  formation: '4-2-3-1',
  goalkeeper: at(POOL.alisson, 'gk', 'GK', 0.5, 0.06),
  defenders: [
    at(POOL.theo, 'lb', 'LB', 0.14, 0.24),
    at(POOL.dias, 'cb1', 'CB', 0.38, 0.2),
    at(POOL.vandijk, 'cb2', 'CB', 0.62, 0.2),
    at(POOL.taa, 'rb', 'RB', 0.86, 0.24),
  ],
  midfielders: [
    at(POOL.rodri, 'cdm1', 'CDM', 0.36, 0.4),
    at(POOL.valverde, 'cdm2', 'CDM', 0.64, 0.4),
    at(POOL.vini, 'lam', 'LW', 0.18, 0.64),
    at(POOL.kdb, 'cam', 'CAM', 0.5, 0.6),
    at(POOL.salah, 'ram', 'RW', 0.82, 0.64),
  ],
  attackers: [at(POOL.haaland, 'st', 'ST', 0.5, 0.86)],
  generalJustification:
    'Un 4-2-3-1 moderno: doble pivote (Rodri, Valverde) que da equilibrio, un trío creativo tras el delantero con desborde y talento (Vinícius, De Bruyne, Salah) y un nueve fijo que finaliza.',
};

/** All supported elevens, keyed by formation. */
export const IDEAL_TEAM_MOCKS: Record<IdealTeamFormation, IdealTeamResponse> = {
  '4-3-3': FORMATION_4_3_3,
  '4-4-2': FORMATION_4_4_2,
  '3-5-2': FORMATION_3_5_2,
  '4-2-3-1': FORMATION_4_2_3_1,
};

/** Back-compat default used by the original design pass (4-3-3). */
export const IDEAL_TEAM_MOCK = FORMATION_4_3_3;
