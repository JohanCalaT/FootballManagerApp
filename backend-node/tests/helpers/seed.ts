import { PlayerModel, IPlayer } from '../../src/models/player.model';

type PlayerSeed = Partial<{
  apiFootballId: number | null;
  name: string;
  team: string;
  league: string;
  position: IPlayer['position'];
  imageUrl: string;
  createdByUserId: string;
  registeredAt: Date;
  comments: Array<{ author: string; text: string; rating: number }>;
  statistics: Array<{ season: number; rating?: number; goals?: number; teamName?: string; leagueName?: string }>;
}>;

export const buildPlayer = (overrides: PlayerSeed = {}): PlayerSeed => ({
  name:            'Pedri González',
  team:            'FC Barcelona',
  league:          'La Liga',
  position:        'Midfielder',
  createdByUserId: 'uid-seed',
  ...overrides,
});

export const seedPlayers = async (n: number): Promise<IPlayer[]> => {
  // Insertamos con diferencia temporal explícita para garantizar orden
  // descendente por registeredAt en los tests de paginación.
  const base = Date.now();
  const docs = Array.from({ length: n }, (_, i) => buildPlayer({
    name:         `Player ${i.toString().padStart(2, '0')}`,
    team:         i % 2 === 0 ? 'FC Barcelona' : 'Real Madrid',
    registeredAt: new Date(base - i * 1000),
  }));
  return PlayerModel.insertMany(docs) as unknown as IPlayer[];
};

export const seedPlayerWithComments = async (commentCount: number): Promise<IPlayer> => {
  return PlayerModel.create(buildPlayer({
    comments: Array.from({ length: commentCount }, (_, i) => ({
      author: `User${i}`,
      text:   `Comment ${i}`,
      rating: i % 6,
    })),
  })) as unknown as IPlayer;
};
