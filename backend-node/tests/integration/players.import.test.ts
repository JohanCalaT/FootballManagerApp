import request from 'supertest';
import app from '../../src/app';
import { PlayerModel } from '../../src/models/player.model';
import * as apiFootball from '../../src/services/apiFootball.service';
import {
  ApiFootballAuthenticationFailed, ApiFootballDailyQuotaExceeded,
  ApiFootballNotFound, ApiFootballRateLimited, ApiFootballSeasonNotAvailable,
  ApiFootballTimeout, ApiFootballUpstreamError,
} from '../../src/errors/apiFootball.errors';

// ─────────────── Fixture mínimo del response de API-Football ───────────────

const messi2022Fixture = (): apiFootball.ApiFootballPlayerStatsResponse => ({
  player: {
    id: 154,
    name: 'L. Messi',
    firstname: 'Lionel',
    lastname: 'Messi',
    nationality: 'Argentina',
    birth: { date: '1987-06-24', place: 'Rosario', country: 'Argentina' },
    height: '170 cm',
    weight: '72 kg',
    number: 30,
    position: 'Attacker',
    injured: false,
    photo: 'https://cdn/messi.png',
  },
  statistics: [
    {
      team:   { id: 85, name: 'Paris Saint Germain', logo: 'https://cdn/psg.png' },
      league: { id: 61, name: 'Ligue 1', country: 'France', logo: 'https://cdn/l1.png', season: 2022 },
      games:  { appearences: 32, lineups: 31, minutes: 2628, position: 'Attacker', rating: '8.103125', captain: false },
      shots:  { total: 84, on: 50 },
      goals:  { total: 16, conceded: 0, assists: 16, saves: 0 },
    },
  ],
});

const yamal2024Fixture = (): apiFootball.ApiFootballPlayerStatsResponse => ({
  player: { id: 909, name: 'Lamine Yamal', position: 'Attacker' },
  statistics: [
    {
      team:   { id: 529, name: 'FC Barcelona' },
      league: { id: 140, name: 'La Liga', country: 'Spain', season: 2024 },
      games:  { appearences: 35, minutes: 3000, rating: '7.6' },
      goals:  { total: 7, assists: 9 },
    },
  ],
});

const sendImport = (body: object, headers: Record<string, string> = {}) =>
  request(app)
    .post('/api/players/import')
    .set('X-User-Id', 'uid-test')
    .set(headers)
    .send(body);

describe('POST /api/players/import', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('happy path', () => {
    it('returns 201 with imported[1] and failed[0] on single new item', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockResolvedValueOnce(messi2022Fixture());

      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);

      expect(res.status).toBe(201);
      expect(res.body.data.imported).toHaveLength(1);
      expect(res.body.data.failed).toEqual([]);
      expect(res.body.data.imported[0].name).toBe('L. Messi');
      expect(res.body.data.imported[0].team).toBe('Paris Saint Germain');
      expect(res.body.data.imported[0].rating).toBe(8.10); // parseRating
      expect(res.body.message).toMatch(/1 jugador\(es\)/);

      // Persistió en BD con apiFootballId + statistics
      const reloaded = await PlayerModel.findOne({ apiFootballId: 154 }).lean();
      expect(reloaded).not.toBeNull();
      expect(reloaded?.statistics).toHaveLength(1);
      expect(reloaded?.statistics[0]?.season).toBe(2022);
      expect(reloaded?.statistics[0]?.rating).toBe(8.10);
      expect(reloaded?.imageSource).toBe('api');
    });

    it('persists clientGeolocation from X-Client-* headers', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockResolvedValueOnce(yamal2024Fixture());

      const res = await sendImport(
        [{ apiFootballId: 909, season: 2024 }],
        { 'X-Client-Lat': '41.38', 'X-Client-Lng': '2.18', 'X-Client-City': 'Barcelona' },
      );

      expect(res.status).toBe(201);
      const reloaded = await PlayerModel.findOne({ apiFootballId: 909 }).lean();
      expect(reloaded?.clientGeolocation).toMatchObject({ lat: 41.38, lng: 2.18, city: 'Barcelona' });
    });
  });

  describe('partial — 207 Multi-Status', () => {
    it('mixes imported and failed (one duplicate, one new)', async () => {
      await PlayerModel.create({
        apiFootballId:   154,
        name:            'L. Messi',
        team:            'PSG',
        league:          'Ligue 1',
        createdByUserId: 'u',
        statistics:      [{ season: 2022 }],
      });
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockResolvedValueOnce(yamal2024Fixture());

      const res = await sendImport([
        { apiFootballId: 154, season: 2022 }, // duplicado
        { apiFootballId: 909, season: 2024 }, // nuevo
      ]);

      expect(res.status).toBe(207);
      expect(res.body.data.imported).toHaveLength(1);
      expect(res.body.data.failed).toHaveLength(1);
      expect(res.body.data.failed[0].reason).toMatch(/Ya importado/);
      expect(res.body.message).toMatch(/1 importados, 1 con error/);
    });

    it('aborts remaining items after a RateLimited and marks them Skipped', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats')
        .mockResolvedValueOnce(messi2022Fixture())                  // item 1 OK
        .mockRejectedValueOnce(new ApiFootballRateLimited());       // item 2 rate-limit
        // item 3 NO se llama

      const res = await sendImport([
        { apiFootballId: 154, season: 2022 },
        { apiFootballId: 874, season: 2022 },
        { apiFootballId: 909, season: 2024 },
      ]);

      expect(res.status).toBe(207);
      expect(res.body.data.imported).toHaveLength(1);
      expect(res.body.data.failed).toHaveLength(2);
      expect(res.body.data.failed[1].reason).toMatch(/Skipped/);
      expect(apiFootball.getPlayerWithStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('validación local (sin tocar API-Football)', () => {
    it('returns 400 when batch is empty', async () => {
      const spy = jest.spyOn(apiFootball, 'getPlayerWithStats');

      const res = await sendImport([]);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/al menos un/i);
      expect(spy).not.toHaveBeenCalled();
    });

    it('returns 400 when batch > 10 without hitting API-Football', async () => {
      const spy = jest.spyOn(apiFootball, 'getPlayerWithStats');
      const items = Array.from({ length: 11 }, (_, i) => ({
        apiFootballId: 100 + i, season: 2024,
      }));

      const res = await sendImport(items);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Máximo 10/);
      expect(res.body.message).toMatch(/Recibidos: 11/);
      expect(spy).not.toHaveBeenCalled();
    });

    it('returns 400 with invalid season (any item) and skips the API call', async () => {
      const spy = jest.spyOn(apiFootball, 'getPlayerWithStats');

      const res = await sendImport([
        { apiFootballId: 154, season: 2022 },
        { apiFootballId: 909, season: 2019 }, // fuera de [2022,2023,2024]
      ]);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/temporada inválida/i);
      expect(spy).not.toHaveBeenCalled();
    });

    it('returns 400 on non-numeric apiFootballId', async () => {
      const res = await sendImport([{ apiFootballId: 'abc', season: 2022 }]);
      expect(res.status).toBe(400);
    });
  });

  describe('autenticación', () => {
    it('returns 401 without X-User-Id', async () => {
      const spy = jest.spyOn(apiFootball, 'getPlayerWithStats');

      const res = await request(app)
        .post('/api/players/import')
        .send([{ apiFootballId: 154, season: 2022 }]);

      expect(res.status).toBe(401);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('todos fallaron — selector de status', () => {
    it('returns 409 when all items are duplicates', async () => {
      await PlayerModel.create({
        apiFootballId: 154, name: 'X', team: 'T', league: 'L',
        createdByUserId: 'u', statistics: [{ season: 2022 }],
      });

      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);

      expect(res.status).toBe(409);
      expect(res.body.data.imported).toEqual([]);
      expect(res.body.data.failed).toHaveLength(1);
    });

    it('returns 503 when first API error is RateLimited', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockRejectedValue(new ApiFootballRateLimited());
      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);
      expect(res.status).toBe(503);
    });

    it('returns 503 when first API error is DailyQuotaExceeded', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockRejectedValue(new ApiFootballDailyQuotaExceeded());
      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);
      expect(res.status).toBe(503);
    });

    it('returns 504 when first API error is Timeout', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockRejectedValue(new ApiFootballTimeout());
      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);
      expect(res.status).toBe(504);
    });

    it('returns 502 when first API error is UpstreamError', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockRejectedValue(new ApiFootballUpstreamError(500));
      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);
      expect(res.status).toBe(502);
    });

    it('returns 404 when first API error is NotFound', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockRejectedValue(new ApiFootballNotFound());
      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);
      expect(res.status).toBe(404);
    });

    it('returns 422 when first API error is SeasonNotAvailable from upstream', async () => {
      // Validación local pasa (2022 es válida) pero la API responde "no coverage"
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockRejectedValue(new ApiFootballSeasonNotAvailable(2022));
      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);
      expect(res.status).toBe(422);
    });

    it('returns 500 when first API error is AuthenticationFailed', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockRejectedValue(new ApiFootballAuthenticationFailed());
      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);
      expect(res.status).toBe(500);
    });

    it('marks single item as "sin datos para 2022" when API returns null', async () => {
      jest.spyOn(apiFootball, 'getPlayerWithStats').mockResolvedValue(null);

      const res = await sendImport([{ apiFootballId: 154, season: 2022 }]);

      // No es ApiFootballError → no hay firstApiError → 409 selector
      expect(res.status).toBe(409);
      expect(res.body.data.failed[0].reason).toMatch(/sin datos para 2022/);
    });
  });
});
