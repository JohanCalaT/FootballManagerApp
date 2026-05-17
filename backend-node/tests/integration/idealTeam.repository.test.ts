import { PlayerModel, PlayerPosition } from '../../src/models/player.model';
import { getAllForIdealTeam } from '../../src/repositories/player.repository';

interface SeedOverrides {
  name?:       string;
  team?:       string;
  position?:   PlayerPosition | null;
  statistics?: Array<Record<string, unknown>>;
}

const newPlayer = (over: SeedOverrides = {}) => ({
  name:            over.name ?? 'X',
  team:            over.team ?? 'T',
  league:          'La Liga',
  position:        over.position === undefined ? 'Midfielder' : over.position,
  createdByUserId: 'uid-1',
  statistics:      over.statistics ?? [],
});

describe('player.repository · getAllForIdealTeam', () => {
  it('aggregates stats across seasons', async () => {
    await PlayerModel.create(newPlayer({
      name: 'Pedri', team: 'FC Barcelona', position: 'Midfielder',
      statistics: [
        { season: 2022, rating: 7.5, goals: 3, assists: 5, appearances: 30, tacklesTotal: 40, goalsSaved: 0 },
        { season: 2023, rating: 8.0, goals: 5, assists: 7, appearances: 32, tacklesTotal: 50, goalsSaved: 0 },
      ],
    }));

    const [dto] = await getAllForIdealTeam();
    if (!dto) throw new Error('expected one dto');

    expect(dto.name).toBe('Pedri');
    expect(dto.team).toBe('FC Barcelona');
    expect(dto.position).toBe('Midfielder');
    expect(dto.averageRating).toBeCloseTo(7.75);
    expect(dto.totalGoals).toBe(8);
    expect(dto.totalAssists).toBe(12);
    expect(dto.totalAppearances).toBe(62);
    expect(dto.totalTackles).toBe(90);
    expect(dto.hasStatistics).toBe(true);
    expect(typeof dto.id).toBe('string');
  });

  it('handles player without statistics — zero sums, null rating', async () => {
    await PlayerModel.create(newPlayer({ name: 'Rookie', position: 'Defender' }));

    const [dto] = await getAllForIdealTeam();
    if (!dto) throw new Error('expected one dto');

    expect(dto.averageRating).toBeNull();
    expect(dto.totalGoals).toBe(0);
    expect(dto.totalAssists).toBe(0);
    expect(dto.totalAppearances).toBe(0);
    expect(dto.totalTackles).toBe(0);
    expect(dto.totalSaves).toBe(0);
    expect(dto.hasStatistics).toBe(false);
  });

  it('averageRating ignores null ratings', async () => {
    await PlayerModel.create(newPlayer({
      name: 'Mixed', position: 'Attacker',
      statistics: [
        { season: 2022, rating: null, goals: 1 },
        { season: 2023, rating: 6.0,  goals: 2 },
        { season: 2024, rating: 8.0,  goals: 3 },
      ],
    }));

    const [dto] = await getAllForIdealTeam();
    if (!dto) throw new Error('expected one dto');

    expect(dto.averageRating).toBeCloseTo(7.0);
    expect(dto.totalGoals).toBe(6);
  });

  it('defaults position to "Unknown" when null', async () => {
    await PlayerModel.create(newPlayer({ name: 'NoPos', position: null }));

    const [dto] = await getAllForIdealTeam();
    if (!dto) throw new Error('expected one dto');
    expect(dto.position).toBe('Unknown');
  });

  it('returns empty array when no players exist', async () => {
    const list = await getAllForIdealTeam();
    expect(list).toEqual([]);
  });
});
