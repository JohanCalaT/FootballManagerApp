import { PlayerForPromptDto } from '../repositories/player.repository';

/**
 * Construye el prompt enviado a Gemini para generar el equipo ideal.
 * Bit-a-bit idéntico al equivalente en .NET (Players.Application/
 * IdealTeam/IdealTeamPrompt.cs) — cambios aquí deben replicarse allí.
 */
export const buildIdealTeamPrompt = (
  formation:    string,
  goalkeepers:  PlayerForPromptDto[],
  defenders:    PlayerForPromptDto[],
  midfielders:  PlayerForPromptDto[],
  attackers:    PlayerForPromptDto[],
): string => {
  const out: string[] = [];

  out.push('Eres un experto táctico en fútbol con conocimiento');
  out.push('profundo de todas las formaciones modernas.');
  out.push('');
  out.push('Tu tarea es seleccionar el mejor equipo posible');
  out.push(`en la formación ${formation} usando ÚNICAMENTE`);
  out.push('los jugadores de la lista proporcionada.');
  out.push('');
  out.push('FORMACIONES QUE CONOCES Y SABES INTERPRETAR:');
  out.push('4-4-2, 4-5-1, 4-3-3, 4-3-2-1, 4-1-3-2,');
  out.push('5-4-1, 4-1-2-1-2, 3-5-2, 5-3-2, 4-2-3-1,');
  out.push('3-4-3, 3-2-4-1, WM (3-2-5), 2-3-2-3, 4-2-4');
  out.push('');

  out.push('JUGADORES DISPONIBLES:');
  out.push('');

  out.push('PORTEROS:');
  appendList(out, goalkeepers, formatGoalkeeper);
  out.push('Formato: id | nombre | equipo | rating | paradas | goles_encajados');
  out.push('');

  out.push('DEFENSAS:');
  appendList(out, defenders, formatDefender);
  out.push('Formato: id | nombre | equipo | rating | entradas | duelos_ganados');
  out.push('');

  out.push('CENTROCAMPISTAS:');
  appendList(out, midfielders, formatMidfielder);
  out.push('Formato: id | nombre | equipo | rating | asistencias | pases_clave');
  out.push('');

  out.push('DELANTEROS:');
  appendList(out, attackers, formatAttacker);
  out.push('Formato: id | nombre | equipo | rating | goles | asistencias');
  out.push('');

  out.push('REGLAS:');
  out.push('1. Usa SOLO jugadores de la lista');
  out.push('2. No repitas jugadores');
  out.push('3. Adapta roles según la formación');
  out.push('   (ej: en 3-5-2 los carrileros pueden ser');
  out.push('   defensas o medios según sus stats)');
  out.push('4. Prioriza mayor rating_promedio');
  out.push('5. Si no hay suficientes en una posición,');
  out.push('   adapta jugadores de posición similar');
  out.push('6. El id debe ser exactamente el de la lista');
  out.push('');

  out.push('COORDENADAS:');
  out.push('Campo de 0.0 a 1.0 en ambos ejes.');
  out.push('x: horizontal (0=izq, 1=der, 0.5=centro)');
  out.push('y: vertical (0=portería propia, 1=portería rival)');
  out.push('');
  out.push('Referencias:');
  out.push('  Portero:    x=0.5,  y=0.05');
  out.push('  Defensas:   y entre 0.15 y 0.30');
  out.push('  Medios:     y entre 0.40 y 0.60');
  out.push('  Delanteros: y entre 0.70 y 0.90');
  out.push('');
  out.push('Distribuye uniformemente en x:');
  out.push('  4 jugadores: x = 0.2, 0.4, 0.6, 0.8');
  out.push('  3 jugadores: x = 0.25, 0.5, 0.75');
  out.push('  2 jugadores: x = 0.3, 0.7');
  out.push('  1 jugador:   x = 0.5');
  out.push('');

  out.push('Responde ÚNICAMENTE con este JSON sin texto');
  out.push('adicional, sin markdown, sin explicaciones:');
  out.push('');
  out.push('{');
  out.push(`  "formation": "${formation}",`);
  out.push('  "goalkeeper": {');
  out.push('    "id": "uuid exacto de la lista",');
  out.push('    "name": "nombre",');
  out.push('    "team": "equipo",');
  out.push('    "position": "GK",');
  out.push('    "x": 0.5,');
  out.push('    "y": 0.05,');
  out.push('    "reason": "justificación"');
  out.push('  },');
  out.push('  "defenders":   [ /* mismo shape, position ∈ {CB,LB,RB,LWB,RWB} */ ],');
  out.push('  "midfielders": [ /* mismo shape, position ∈ {CDM,CM,CAM,LM,RM}  */ ],');
  out.push('  "attackers":   [ /* mismo shape, position ∈ {LW,RW,CF,ST}        */ ],');
  out.push('  "generalJustification": "análisis táctico"');
  out.push('}');

  return out.join('\n');
};

const appendList = (
  out: string[],
  list: PlayerForPromptDto[],
  fmt: (p: PlayerForPromptDto) => string,
): void => {
  if (list.length === 0) { out.push('(ninguno)'); return; }
  for (const p of list) out.push(fmt(p));
};

const rating = (r: number | null): string =>
  r === null ? 'N/A' : r.toFixed(2);

const formatGoalkeeper = (p: PlayerForPromptDto): string =>
  `${p.id} | ${p.name} | ${p.team} | rating:${rating(p.averageRating)} | ` +
  `paradas:${p.totalSaves} | apariciones:${p.totalAppearances}`;

const formatDefender = (p: PlayerForPromptDto): string =>
  `${p.id} | ${p.name} | ${p.team} | rating:${rating(p.averageRating)} | ` +
  `entradas:${p.totalTackles} | apariciones:${p.totalAppearances}`;

const formatMidfielder = (p: PlayerForPromptDto): string =>
  `${p.id} | ${p.name} | ${p.team} | rating:${rating(p.averageRating)} | ` +
  `asis:${p.totalAssists} | apariciones:${p.totalAppearances}`;

const formatAttacker = (p: PlayerForPromptDto): string =>
  `${p.id} | ${p.name} | ${p.team} | rating:${rating(p.averageRating)} | ` +
  `goles:${p.totalGoals} | asis:${p.totalAssists}`;
