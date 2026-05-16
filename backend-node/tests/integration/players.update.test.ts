import request from 'supertest';
import { Types } from 'mongoose';
import app from '../../src/app';
import { PlayerModel } from '../../src/models/player.model';
import { buildPlayer } from '../helpers/seed';

const seedOne = async () =>
  PlayerModel.create(buildPlayer({ name: 'Pedri González', team: 'FC Barcelona', league: 'La Liga' }));

const asAdmin = (req: request.Test) =>
  req.set('X-User-Id', 'uid-admin').set('X-User-Admin', 'true');

describe('PUT /api/players/:id', () => {
  describe('happy path', () => {
    it('returns 200 with updated fields', async () => {
      const player = await seedOne();

      const res = await asAdmin(
        request(app)
          .put(`/api/players/${player._id.toString()}`)
          .send({ team: 'PSG', league: 'Ligue 1', shirtNumber: 30 }),
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Jugador actualizado');
      expect(res.body.data.team).toBe('PSG');
      expect(res.body.data.league).toBe('Ligue 1');
      expect(res.body.data.shirtNumber).toBe(30);
      // No cambian campos no enviados
      expect(res.body.data.name).toBe('Pedri González');
      expect(res.body.data.createdByUserId).toBe('uid-seed');
    });

    it('persists playerGeolocation when provided', async () => {
      const player = await seedOne();

      const res = await asAdmin(
        request(app)
          .put(`/api/players/${player._id.toString()}`)
          .send({ playerGeolocation: { lat: 41.38, lng: 2.18, city: 'Barcelona' } }),
      );

      expect(res.status).toBe(200);
      expect(res.body.data.playerGeolocation).toEqual({
        lat: 41.38, lng: 2.18, city: 'Barcelona',
      });
    });

    it('includes admin HATEOAS links (update, delete)', async () => {
      const player = await seedOne();
      const id = player._id.toString();

      const res = await asAdmin(
        request(app).put(`/api/players/${id}`).send({ injured: true }),
      );

      expect(res.body._links.self.href).toBe(`/api/players/${id}`);
      expect(res.body._links.update).toBeDefined();
      expect(res.body._links.delete).toBeDefined();
    });
  });

  describe('autorización', () => {
    it('returns 403 without X-User-Admin', async () => {
      const player = await seedOne();

      const res = await request(app)
        .put(`/api/players/${player._id.toString()}`)
        .set('X-User-Id', 'uid-regular')
        .send({ team: 'PSG' });

      expect(res.status).toBe(403);
      // No se aplicó el cambio
      const reloaded = await PlayerModel.findById(player._id).lean();
      expect(reloaded?.team).toBe('FC Barcelona');
    });

    it('returns 403 with X-User-Admin: false', async () => {
      const player = await seedOne();

      const res = await request(app)
        .put(`/api/players/${player._id.toString()}`)
        .set('X-User-Admin', 'false')
        .send({ team: 'PSG' });

      expect(res.status).toBe(403);
    });
  });

  describe('not found', () => {
    it('returns 404 when id does not exist', async () => {
      const ghostId = new Types.ObjectId().toString();

      const res = await asAdmin(
        request(app).put(`/api/players/${ghostId}`).send({ team: 'PSG' }),
      );

      expect(res.status).toBe(404);
    });

    it('returns 404 when id is malformed', async () => {
      const res = await asAdmin(
        request(app).put('/api/players/no-soy-objectid').send({ team: 'PSG' }),
      );
      expect(res.status).toBe(404);
    });
  });

  describe('validación de body', () => {
    it('returns 400 with invalid position enum', async () => {
      const player = await seedOne();

      const res = await asAdmin(
        request(app)
          .put(`/api/players/${player._id.toString()}`)
          .send({ position: 'Coach' }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 with shirtNumber > 99', async () => {
      const player = await seedOne();

      const res = await asAdmin(
        request(app)
          .put(`/api/players/${player._id.toString()}`)
          .send({ shirtNumber: 1000 }),
      );

      expect(res.status).toBe(400);
    });

    it('returns 400 with invalid playerGeolocation.lat', async () => {
      const player = await seedOne();

      const res = await asAdmin(
        request(app)
          .put(`/api/players/${player._id.toString()}`)
          .send({ playerGeolocation: { lat: 999, lng: 0 } }),
      );

      expect(res.status).toBe(400);
    });

    it('accepts empty body without modifying anything', async () => {
      const player = await seedOne();
      const before = player.toObject() as unknown as { name: string; team: string };

      const res = await asAdmin(
        request(app).put(`/api/players/${player._id.toString()}`).send({}),
      );

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(before.name);
      expect(res.body.data.team).toBe(before.team);
    });
  });
});

describe('DELETE /api/players/:id', () => {
  it('returns 204 and removes the document', async () => {
    const player = await seedOne();
    const id = player._id.toString();

    const res = await asAdmin(request(app).delete(`/api/players/${id}`));

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(await PlayerModel.findById(id).lean()).toBeNull();
  });

  it('returns 204 idempotently when the player does not exist', async () => {
    const ghostId = new Types.ObjectId().toString();

    const res = await asAdmin(request(app).delete(`/api/players/${ghostId}`));

    expect(res.status).toBe(204);
  });

  it('returns 204 idempotently when id is malformed', async () => {
    const res = await asAdmin(request(app).delete('/api/players/no-soy-objectid'));

    expect(res.status).toBe(204);
  });

  it('returns 403 without X-User-Admin', async () => {
    const player = await seedOne();

    const res = await request(app)
      .delete(`/api/players/${player._id.toString()}`)
      .set('X-User-Id', 'uid-regular');

    expect(res.status).toBe(403);
    // El documento sigue ahí
    expect(await PlayerModel.findById(player._id).lean()).not.toBeNull();
  });
});
