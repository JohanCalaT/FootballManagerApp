import request from 'supertest';
import app from '../../src/app';
import { seedPlayers } from '../helpers/seed';
import { PlayerModel } from '../../src/models/player.model';

describe('GET /api/players', () => {
  describe('happy path', () => {
    it('returns paged list ordered by registeredAt desc', async () => {
      await seedPlayers(15);

      const res = await request(app).get('/api/players?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.total).toBe(15);
      expect(res.body.pages).toBe(2);
      // El más reciente es Player 00 (base de tiempo más alta)
      expect(res.body.data[0].name).toBe('Player 00');
    });

    it('returns second page with remaining items', async () => {
      await seedPlayers(15);

      const res = await request(app).get('/api/players?page=2&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.page).toBe(2);
      expect(res.body.pages).toBe(2);
    });

    it('returns empty list when no players', async () => {
      const res = await request(app).get('/api/players');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.pages).toBe(0);
      expect(res.body.message).toBe('No hay jugadores');
    });
  });

  describe('paginación HATEOAS', () => {
    it('includes self/first/last/next when on first page with more pages', async () => {
      await seedPlayers(25);

      const res = await request(app).get('/api/players?page=1&limit=10');

      expect(res.body._links.self.href).toBe('/api/players?page=1&limit=10');
      expect(res.body._links.first.href).toBe('/api/players?page=1&limit=10');
      expect(res.body._links.last.href).toBe('/api/players?page=3&limit=10');
      expect(res.body._links.next.href).toBe('/api/players?page=2&limit=10');
      expect(res.body._links.prev).toBeUndefined();
    });

    it('includes prev when on a middle page', async () => {
      await seedPlayers(25);

      const res = await request(app).get('/api/players?page=2&limit=10');

      expect(res.body._links.prev.href).toBe('/api/players?page=1&limit=10');
      expect(res.body._links.next.href).toBe('/api/players?page=3&limit=10');
    });

    it('omits next when on last page', async () => {
      await seedPlayers(15);

      const res = await request(app).get('/api/players?page=2&limit=10');

      expect(res.body._links.next).toBeUndefined();
      expect(res.body._links.prev.href).toBe('/api/players?page=1&limit=10');
    });
  });

  describe('normalización de query params', () => {
    it('defaults to page=1 limit=10 when missing', async () => {
      await seedPlayers(3);

      const res = await request(app).get('/api/players');

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('falls back to defaults when params are negative or non-numeric', async () => {
      await seedPlayers(3);

      const res = await request(app).get('/api/players?page=-5&limit=abc');

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('caps limit at 100 to prevent abuse', async () => {
      const res = await request(app).get('/api/players?limit=999');

      expect(res.body.limit).toBe(100);
    });
  });

  describe('forma del item', () => {
    it('list items expose id (no _id) and only the listing fields', async () => {
      await PlayerModel.create({
        name:            'Lamine Yamal',
        team:            'FC Barcelona',
        league:          'La Liga',
        position:        'Attacker',
        imageUrl:        'https://cdn.example/yamal.png',
        createdByUserId: 'uid-test',
        statistics:      [{ season: 2024, rating: 7.8 }, { season: 2023, rating: 6.5 }],
      });

      const res = await request(app).get('/api/players');
      const [item] = res.body.data;

      expect(typeof item.id).toBe('string');
      expect(item.id).toMatch(/^[a-f0-9]{24}$/i);
      expect(item._id).toBeUndefined();
      expect(item.__v).toBeUndefined();
      expect(item.name).toBe('Lamine Yamal');
      expect(item.imageUrl).toBe('https://cdn.example/yamal.png');
      expect(item.rating).toBe(7.8); // mejor rating entre statistics
    });
  });
});
