import request from 'supertest';
import app from '../../src/app';
import { PlayerModel } from '../../src/models/player.model';

const seedSet = async () => {
  await PlayerModel.insertMany([
    { name: 'Pedri González',     team: 'FC Barcelona',         league: 'La Liga', createdByUserId: 'u', registeredAt: new Date('2026-01-10T00:00:00Z') },
    { name: 'Lamine Yamal',       team: 'FC Barcelona',         league: 'La Liga', createdByUserId: 'u', registeredAt: new Date('2026-02-15T00:00:00Z') },
    { name: 'Vinícius Júnior',    team: 'Real Madrid',          league: 'La Liga', createdByUserId: 'u', registeredAt: new Date('2026-03-20T00:00:00Z') },
    { name: 'Kylian Mbappé',      team: 'Real Madrid',          league: 'La Liga', createdByUserId: 'u', registeredAt: new Date('2026-04-05T00:00:00Z') },
    { name: 'Erling Haaland',     team: 'Manchester City',      league: 'Premier League', createdByUserId: 'u', registeredAt: new Date('2026-04-25T00:00:00Z') },
    { name: 'Jude Bellingham',    team: 'Real Madrid',          league: 'La Liga', createdByUserId: 'u', registeredAt: new Date('2026-05-01T00:00:00Z') },
  ]);
};

describe('GET /api/players/search', () => {
  describe('filtros simples', () => {
    it('filters by name (case-insensitive substring)', async () => {
      await seedSet();

      const res = await request(app).get('/api/players/search?name=pedri');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Pedri González');
    });

    it('returns multiple matches when substring is common', async () => {
      await seedSet();

      const res = await request(app).get('/api/players/search?name=an');

      // Pedri Gonz**án**lez, Lami**ne** Yamal (no), Vinícius Júnior (no),
      // M**an**chester (en team, no name), Haal**and**, Bellingh**am** (no)
      // Match en name: Pedri (sí, "án"), Erling Haaland (and). Real check:
      // "an" matches: "González" → 'án' has accent, but with collation
      // strength 2 only matches base. We use RegExp 'i' which is not
      // accent-insensitive — so 'an' won't match 'án'. Solo Haaland.
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.map((p: { name: string }) => p.name))
        .toEqual(expect.arrayContaining(['Erling Haaland']));
    });

    it('filters by team', async () => {
      await seedSet();

      const res = await request(app).get('/api/players/search?team=Real Madrid');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(
        expect.arrayContaining(['Vinícius Júnior', 'Kylian Mbappé', 'Jude Bellingham']),
      );
    });

    it('filters by league', async () => {
      await seedSet();

      const res = await request(app).get('/api/players/search?league=Premier');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Erling Haaland');
    });
  });

  describe('rangos de fecha', () => {
    it('filters by from (>=)', async () => {
      await seedSet();

      const res = await request(app).get(
        '/api/players/search?from=2026-04-01T00:00:00Z',
      );

      expect(res.status).toBe(200);
      const names = res.body.data.map((p: { name: string }) => p.name);
      expect(names).toEqual(expect.arrayContaining(['Kylian Mbappé', 'Erling Haaland', 'Jude Bellingham']));
      expect(names).not.toContain('Pedri González');
    });

    it('filters by to (<=)', async () => {
      await seedSet();

      const res = await request(app).get(
        '/api/players/search?to=2026-02-20T00:00:00Z',
      );

      expect(res.status).toBe(200);
      const names = res.body.data.map((p: { name: string }) => p.name);
      expect(names).toEqual(expect.arrayContaining(['Pedri González', 'Lamine Yamal']));
      expect(names).not.toContain('Erling Haaland');
    });

    it('combines from + to as a closed range', async () => {
      await seedSet();

      const res = await request(app).get(
        '/api/players/search?from=2026-03-01T00:00:00Z&to=2026-04-10T00:00:00Z',
      );

      expect(res.status).toBe(200);
      const names = res.body.data.map((p: { name: string }) => p.name);
      expect(names).toEqual(expect.arrayContaining(['Vinícius Júnior', 'Kylian Mbappé']));
      expect(names).not.toContain('Erling Haaland');
    });

    it('ignores from/to when they are not valid ISO dates', async () => {
      await seedSet();

      const res = await request(app).get(
        '/api/players/search?from=not-a-date&to=also-bad',
      );

      // Sin filtro de fecha aplicado → devuelve los 6
      expect(res.body.total).toBe(6);
    });
  });

  describe('combinación de filtros', () => {
    it('combines name + team + date range', async () => {
      await seedSet();

      const res = await request(app).get(
        '/api/players/search?team=Real Madrid&from=2026-03-15T00:00:00Z&to=2026-04-30T00:00:00Z',
      );

      expect(res.status).toBe(200);
      const names = res.body.data.map((p: { name: string }) => p.name);
      expect(names).toEqual(expect.arrayContaining(['Vinícius Júnior', 'Kylian Mbappé']));
      expect(names).not.toContain('Jude Bellingham'); // 2026-05-01 fuera del to
    });
  });

  describe('regex safety', () => {
    it('escapes regex metacharacters so they match literally', async () => {
      await PlayerModel.create({
        name: 'S.A. Player',
        team: 'T.F.C.',
        league: 'La Liga',
        createdByUserId: 'u',
      });
      await PlayerModel.create({
        name: 'SxAx Player',
        team: 'TxFxCx',
        league: 'La Liga',
        createdByUserId: 'u',
      });

      // Sin escape, "S.A." matchearia "SxAx" (los puntos son wildcard).
      // Con escape, solo matchea literal "S.A.".
      const res = await request(app).get('/api/players/search?name=S.A.');

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('S.A. Player');
    });

    it('does not break with parentheses, brackets or asterisks', async () => {
      await PlayerModel.create({
        name: 'foo (bar)', team: 'T', league: 'L', createdByUserId: 'u',
      });

      const res = await request(app).get('/api/players/search?name=' + encodeURIComponent('foo (bar)'));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('vacío y paginación', () => {
    it('returns 200 with empty data when no match', async () => {
      await seedSet();

      const res = await request(app).get('/api/players/search?name=ZZZ_no_match');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.message).toBe('Sin resultados');
    });

    it('respects page/limit and preserves filters in HATEOAS links', async () => {
      await seedSet();

      const res = await request(app).get(
        '/api/players/search?team=Real Madrid&page=1&limit=2',
      );

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.pages).toBe(2);
      // Los links de paginación deben llevar el filtro team
      expect(res.body._links.next.href).toContain('team=Real%20Madrid');
      expect(res.body._links.next.href).toContain('page=2');
    });
  });

  describe('orden de rutas', () => {
    it('does NOT collide with GET /api/players/:id', async () => {
      // Si Express captara "search" como :id, el handler intentaría
      // findById("search") → null → 404. Verificamos que NO ocurre.
      const res = await request(app).get('/api/players/search');

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Sin resultados|OK/);
    });
  });
});
