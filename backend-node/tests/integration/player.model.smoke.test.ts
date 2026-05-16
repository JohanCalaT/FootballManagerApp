import mongoose, { Types } from 'mongoose';
import { PlayerModel, IPlayer } from '../../src/models/player.model';

describe('PlayerModel — smoke test', () => {
  describe('schema básico', () => {
    it('persiste y recupera un Player con campos requeridos', async () => {
      const created = await PlayerModel.create({
        name: 'Pedri González',
        team: 'FC Barcelona',
        league: 'La Liga',
        createdByUserId: 'uid-test',
      });

      const reloaded = await PlayerModel.findById(created._id).lean<IPlayer>().exec();

      expect(reloaded).not.toBeNull();
      expect(reloaded?.name).toBe('Pedri González');
      expect(reloaded?.team).toBe('FC Barcelona');
      expect(reloaded?.league).toBe('La Liga');
      expect(reloaded?.injured).toBe(false);
      expect(reloaded?.apiFootballId).toBeNull();
      expect(reloaded?.statistics).toEqual([]);
      expect(reloaded?.comments).toEqual([]);
      expect(reloaded?.registeredAt).toBeInstanceOf(Date);
    });

    it('rechaza Player sin campos required (name, team, league, createdByUserId)', async () => {
      await expect(PlayerModel.create({ name: 'Solo nombre' })).rejects.toThrow(/validation/i);
    });

    it('rechaza position fuera del enum', async () => {
      await expect(
        PlayerModel.create({
          name: 'X', team: 'T', league: 'L', createdByUserId: 'uid',
          position: 'Coach' as unknown as 'Goalkeeper',
        }),
      ).rejects.toThrow(/Coach/);
    });
  });

  describe('comments anidados', () => {
    it('embebe comments dentro del documento Player', async () => {
      const player = await PlayerModel.create({
        name: 'Lamine Yamal',
        team: 'FC Barcelona',
        league: 'La Liga',
        createdByUserId: 'uid-test',
        comments: [
          { author: 'Juan', text: 'Crack absoluto', rating: 5 },
          { author: 'María', text: 'Promesa real', rating: 4 },
        ],
      });

      const reloaded = await PlayerModel.findById(player._id).lean<IPlayer>().exec();

      expect(reloaded?.comments).toHaveLength(2);
      expect(reloaded?.comments[0]?.author).toBe('Juan');
      expect(reloaded?.comments[0]?.rating).toBe(5);
      // Cada comment tiene _id propio (lo necesitamos para DELETE /api/comments/:id)
      expect(reloaded?.comments[0]?._id).toBeInstanceOf(Types.ObjectId);
    });

    it('rechaza comment con text > 1000 chars', async () => {
      await expect(
        PlayerModel.create({
          name: 'X', team: 'T', league: 'L', createdByUserId: 'uid',
          comments: [{ author: 'A', text: 'x'.repeat(1001), rating: 3 }],
        }),
      ).rejects.toThrow(/validation/i);
    });

    it('rechaza comment con rating fuera de [0, 5]', async () => {
      await expect(
        PlayerModel.create({
          name: 'X', team: 'T', league: 'L', createdByUserId: 'uid',
          comments: [{ author: 'A', text: 'ok', rating: 6 }],
        }),
      ).rejects.toThrow(/validation/i);
    });
  });

  describe('statistics anidadas', () => {
    it('embebe varias entradas de statistics (1:N por liga/temporada)', async () => {
      const player = await PlayerModel.create({
        name: 'L. Messi',
        team: 'Paris Saint Germain',
        league: 'Ligue 1',
        createdByUserId: 'uid-test',
        apiFootballId: 154,
        statistics: [
          { season: 2022, leagueId: 61,  leagueName: 'Ligue 1',          teamId: 85, teamName: 'PSG', goals: 16, assists: 16 },
          { season: 2022, leagueId: 2,   leagueName: 'UEFA Champions',   teamId: 85, teamName: 'PSG', goals: 4,  assists: 1  },
          { season: 2022, leagueId: 1,   leagueName: 'World Cup',        teamId: 26, teamName: 'Argentina', goals: 7, assists: 3 },
        ],
      });

      const reloaded = await PlayerModel.findById(player._id).lean<IPlayer>().exec();
      expect(reloaded?.statistics).toHaveLength(3);
      expect(reloaded?.statistics[0]?.season).toBe(2022);
      expect(reloaded?.statistics[0]?.appearances).toBe(0); // default
    });

    it('requiere season en cada PlayerStatistics', async () => {
      await expect(
        PlayerModel.create({
          name: 'X', team: 'T', league: 'L', createdByUserId: 'uid',
          statistics: [{ leagueName: 'Sin season' }],
        }),
      ).rejects.toThrow(/validation/i);
    });
  });

  describe('apiFootballId unique parcial', () => {
    it('permite varios Players con apiFootballId=null (manuales)', async () => {
      await PlayerModel.create({ name: 'A', team: 'T1', league: 'L1', createdByUserId: 'u' });
      await PlayerModel.create({ name: 'B', team: 'T2', league: 'L2', createdByUserId: 'u' });
      // No throw — el partialFilter excluye null del UNIQUE
      expect(await PlayerModel.countDocuments()).toBe(2);
    });

    it('bloquea dos Players con el mismo apiFootballId', async () => {
      // Asegurar índices creados (importante en mongodb-memory-server)
      await PlayerModel.syncIndexes();
      await PlayerModel.create({
        name: 'Messi', team: 'PSG', league: 'Ligue 1', createdByUserId: 'u', apiFootballId: 154,
      });
      await expect(
        PlayerModel.create({
          name: 'Messi duplicado', team: 'PSG', league: 'Ligue 1', createdByUserId: 'u', apiFootballId: 154,
        }),
      ).rejects.toThrow(/duplicate key/i);
    });
  });

  describe('toJSON', () => {
    it('serializa _id como id (string) y omite __v', async () => {
      const player = await PlayerModel.create({
        name: 'P', team: 'T', league: 'L', createdByUserId: 'u',
      });
      const json = player.toJSON() as unknown as Record<string, unknown>;
      expect(typeof json.id).toBe('string');
      expect(json.__v).toBeUndefined();
    });
  });

  describe('geolocation', () => {
    it('persiste clientGeolocation y playerGeolocation como Owned Object', async () => {
      const player = await PlayerModel.create({
        name: 'P', team: 'T', league: 'L', createdByUserId: 'u',
        clientGeolocation: { lat: 36.83,  lng: -2.46, city: 'Almería', country: 'Spain' },
        playerGeolocation: { lat: 41.38,  lng: 2.18,  city: 'Barcelona', country: 'Spain' },
      });
      const reloaded = await PlayerModel.findById(player._id).lean<IPlayer>().exec();
      expect(reloaded?.clientGeolocation?.city).toBe('Almería');
      expect(reloaded?.playerGeolocation?.city).toBe('Barcelona');
    });

    it('rechaza lat fuera de [-90, 90]', async () => {
      await expect(
        PlayerModel.create({
          name: 'P', team: 'T', league: 'L', createdByUserId: 'u',
          clientGeolocation: { lat: 999, lng: 0 },
        }),
      ).rejects.toThrow(/validation/i);
    });
  });
});

// Sanity: el setup global conecta mongoose vía mongodb-memory-server
afterAll(() => {
  expect(mongoose.connection.readyState).toBeGreaterThanOrEqual(0);
});
