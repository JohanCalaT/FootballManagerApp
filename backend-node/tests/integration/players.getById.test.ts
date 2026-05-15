import request from 'supertest';
import { Types } from 'mongoose';
import app from '../../src/app';
import { PlayerModel } from '../../src/models/player.model';
import { seedPlayerWithComments } from '../helpers/seed';

describe('GET /api/players/:id', () => {
  describe('happy path', () => {
    it('returns 200 with embedded comments and statistics', async () => {
      const player = await PlayerModel.create({
        name:            'L. Messi',
        team:            'Paris Saint Germain',
        league:          'Ligue 1',
        position:        'Attacker',
        createdByUserId: 'uid-test',
        apiFootballId:   154,
        statistics: [
          { season: 2022, leagueName: 'Ligue 1', teamName: 'PSG', goals: 16, assists: 16, rating: 8.1 },
          { season: 2022, leagueName: 'UCL',     teamName: 'PSG', goals: 4,  assists: 1,  rating: 7.5 },
        ],
        comments: [
          { author: 'Juan',  text: 'GOAT',         rating: 5 },
          { author: 'María', text: 'Mejor de la historia', rating: 5 },
        ],
      });

      const res = await request(app).get(`/api/players/${player._id.toString()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(player._id.toString());
      expect(res.body.data.name).toBe('L. Messi');
      expect(res.body.data.statistics).toHaveLength(2);
      expect(res.body.data.statistics[0].season).toBe(2022);
      expect(res.body.data.comments).toHaveLength(2);
      // El _id del comment se serializa como id (lo necesitará DELETE)
      expect(typeof res.body.data.comments[0].id).toBe('string');
      expect(res.body.data.comments[0].id).toMatch(/^[a-f0-9]{24}$/i);
    });
  });

  describe('errores', () => {
    it('returns 404 when player does not exist', async () => {
      const ghostId = new Types.ObjectId().toString();

      const res = await request(app).get(`/api/players/${ghostId}`);

      expect(res.status).toBe(404);
      expect(res.body.data).toBeNull();
      expect(res.body.message).toMatch(/no encontrado/i);
    });

    it('returns 404 when id has invalid ObjectId format', async () => {
      // Repo devuelve null en ids inválidos, service lanza PlayerNotFoundError → 404
      const res = await request(app).get('/api/players/no-soy-un-objectid');

      expect(res.status).toBe(404);
    });
  });

  describe('HATEOAS por rol', () => {
    it('includes only public links (self/collection/comments) without X-User-Admin', async () => {
      const player = await seedPlayerWithComments(0);
      const id = player._id.toString();

      const res = await request(app).get(`/api/players/${id}`);

      expect(res.body._links.self.href).toBe(`/api/players/${id}`);
      expect(res.body._links.collection.href).toBe('/api/players');
      expect(res.body._links.comments.href).toBe(`/api/comments/player/${id}`);
      expect(res.body._links.update).toBeUndefined();
      expect(res.body._links.delete).toBeUndefined();
    });

    it('includes update + delete when X-User-Admin: true', async () => {
      const player = await seedPlayerWithComments(0);
      const id = player._id.toString();

      const res = await request(app)
        .get(`/api/players/${id}`)
        .set('X-User-Admin', 'true');

      expect(res.body._links.update.href).toBe(`/api/players/${id}`);
      expect(res.body._links.update.method).toBe('PUT');
      expect(res.body._links.delete.href).toBe(`/api/players/${id}`);
      expect(res.body._links.delete.method).toBe('DELETE');
    });

    it('does not promote a non-admin user to admin links', async () => {
      const player = await seedPlayerWithComments(0);

      const res = await request(app)
        .get(`/api/players/${player._id.toString()}`)
        .set('X-User-Id', 'uid-regular')
        .set('X-User-Admin', 'false');

      expect(res.body._links.update).toBeUndefined();
      expect(res.body._links.delete).toBeUndefined();
    });
  });

  describe('forma de la respuesta', () => {
    it('exposes id and omits internal mongoose fields (__v, _id)', async () => {
      const player = await seedPlayerWithComments(1);

      const res = await request(app).get(`/api/players/${player._id.toString()}`);

      expect(res.body.data._id).toBeUndefined();
      expect(res.body.data.__v).toBeUndefined();
      expect(res.body.data.id).toBe(player._id.toString());
    });
  });
});
