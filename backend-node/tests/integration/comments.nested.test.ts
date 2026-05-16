import request from 'supertest';
import { Types } from 'mongoose';
import app from '../../src/app';
import { PlayerModel } from '../../src/models/player.model';
import { buildPlayer, seedPlayerWithComments } from '../helpers/seed';

const asAdmin = (req: request.Test) =>
  req.set('X-User-Id', 'uid-admin').set('X-User-Admin', 'true');

describe('GET /api/comments/player/:playerId', () => {
  it('returns 200 with the embedded comments array', async () => {
    const player = await seedPlayerWithComments(3);

    const res = await request(app).get(`/api/comments/player/${player._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(typeof res.body.data[0].id).toBe('string');
    expect(res.body.data[0].author).toBe('User0');
  });

  it('returns 200 with empty array when player has no comments', async () => {
    const player = await PlayerModel.create(buildPlayer());

    const res = await request(app).get(`/api/comments/player/${player._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.message).toBe('Sin comentarios');
  });

  it('returns 404 when player does not exist', async () => {
    const ghostId = new Types.ObjectId().toString();

    const res = await request(app).get(`/api/comments/player/${ghostId}`);

    expect(res.status).toBe(404);
  });

  it('returns 404 when playerId is malformed', async () => {
    const res = await request(app).get('/api/comments/player/no-soy-objectid');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/comments/player/:playerId', () => {
  const validBody = { author: 'Juan', text: 'Crack absoluto', rating: 5 };

  describe('happy path', () => {
    it('returns 201 with the new comment (id, fields) and Location header', async () => {
      const player = await PlayerModel.create(buildPlayer());
      const id = player._id.toString();

      const res = await request(app)
        .post(`/api/comments/player/${id}`)
        .set('X-User-Id', 'uid-test')
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.data.id).toMatch(/^[a-f0-9]{24}$/i);
      expect(res.body.data.author).toBe('Juan');
      expect(res.body.data.text).toBe('Crack absoluto');
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.createdByUserId).toBe('uid-test');
      expect(res.headers.location).toBe(`/api/comments/${res.body.data.id}`);

      // Verifica que persistió en el array anidado, no como colección aparte
      const reloaded = await PlayerModel.findById(id).lean();
      expect(reloaded?.comments).toHaveLength(1);
      expect(reloaded?.comments[0]?.author).toBe('Juan');
    });

    it('persists clientGeolocation from X-Client-* headers', async () => {
      const player = await PlayerModel.create(buildPlayer());

      const res = await request(app)
        .post(`/api/comments/player/${player._id.toString()}`)
        .set('X-User-Id',  'uid-test')
        .set('X-Client-Lat', '41.38')
        .set('X-Client-Lng', '2.18')
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.data.clientGeolocation).toEqual({ lat: 41.38, lng: 2.18 });
    });

    it('accepts rating boundaries 0 and 5', async () => {
      const player = await PlayerModel.create(buildPlayer());
      const id = player._id.toString();

      const res0 = await request(app).post(`/api/comments/player/${id}`)
        .set('X-User-Id', 'u').send({ ...validBody, rating: 0 });
      const res5 = await request(app).post(`/api/comments/player/${id}`)
        .set('X-User-Id', 'u').send({ ...validBody, rating: 5 });

      expect(res0.status).toBe(201);
      expect(res5.status).toBe(201);
    });
  });

  describe('autenticación', () => {
    it('returns 401 without X-User-Id', async () => {
      const player = await PlayerModel.create(buildPlayer());

      const res = await request(app)
        .post(`/api/comments/player/${player._id.toString()}`)
        .send(validBody);

      expect(res.status).toBe(401);
      // No se añadió nada al array
      const reloaded = await PlayerModel.findById(player._id).lean();
      expect(reloaded?.comments).toEqual([]);
    });
  });

  describe('validación', () => {
    it('returns 400 when text > 1000 chars', async () => {
      const player = await PlayerModel.create(buildPlayer());

      const res = await request(app)
        .post(`/api/comments/player/${player._id.toString()}`)
        .set('X-User-Id', 'u')
        .send({ ...validBody, text: 'x'.repeat(1001) });

      expect(res.status).toBe(400);
    });

    it('returns 400 when rating > 5', async () => {
      const player = await PlayerModel.create(buildPlayer());

      const res = await request(app)
        .post(`/api/comments/player/${player._id.toString()}`)
        .set('X-User-Id', 'u')
        .send({ ...validBody, rating: 6 });

      expect(res.status).toBe(400);
    });

    it('returns 400 when rating < 0', async () => {
      const player = await PlayerModel.create(buildPlayer());

      const res = await request(app)
        .post(`/api/comments/player/${player._id.toString()}`)
        .set('X-User-Id', 'u')
        .send({ ...validBody, rating: -1 });

      expect(res.status).toBe(400);
    });

    it('returns 400 when author is missing', async () => {
      const player = await PlayerModel.create(buildPlayer());

      const res = await request(app)
        .post(`/api/comments/player/${player._id.toString()}`)
        .set('X-User-Id', 'u')
        .send({ text: 'sin autor', rating: 3 });

      expect(res.status).toBe(400);
    });
  });

  describe('not found', () => {
    it('returns 404 when player does not exist', async () => {
      const ghostId = new Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/comments/player/${ghostId}`)
        .set('X-User-Id', 'u')
        .send(validBody);

      expect(res.status).toBe(404);
    });
  });
});

describe('DELETE /api/comments/:commentId', () => {
  it('returns 204 and removes the comment from the array', async () => {
    const player = await seedPlayerWithComments(3);
    const targetCommentId = (player.comments[0]!._id as Types.ObjectId).toString();

    const res = await asAdmin(request(app).delete(`/api/comments/${targetCommentId}`));

    expect(res.status).toBe(204);
    const reloaded = await PlayerModel.findById(player._id).lean();
    expect(reloaded?.comments).toHaveLength(2);
    expect(reloaded?.comments.find((c) => c._id?.toString() === targetCommentId)).toBeUndefined();
  });

  it('returns 204 idempotently when the comment does not exist', async () => {
    const ghostId = new Types.ObjectId().toString();

    const res = await asAdmin(request(app).delete(`/api/comments/${ghostId}`));

    expect(res.status).toBe(204);
  });

  it('returns 204 idempotently when commentId is malformed', async () => {
    const res = await asAdmin(request(app).delete('/api/comments/no-soy-objectid'));

    expect(res.status).toBe(204);
  });

  it('returns 403 without X-User-Admin', async () => {
    const player = await seedPlayerWithComments(2);
    const commentId = (player.comments[0]!._id as Types.ObjectId).toString();

    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('X-User-Id', 'uid-regular');

    expect(res.status).toBe(403);
    // El comment sigue ahí
    const reloaded = await PlayerModel.findById(player._id).lean();
    expect(reloaded?.comments).toHaveLength(2);
  });

  it('does not affect other comments of other players', async () => {
    const p1 = await seedPlayerWithComments(2);
    const p2 = await seedPlayerWithComments(3);
    const targetCommentId = (p1.comments[0]!._id as Types.ObjectId).toString();

    await asAdmin(request(app).delete(`/api/comments/${targetCommentId}`));

    const reloaded1 = await PlayerModel.findById(p1._id).lean();
    const reloaded2 = await PlayerModel.findById(p2._id).lean();
    expect(reloaded1?.comments).toHaveLength(1);
    expect(reloaded2?.comments).toHaveLength(3);
  });
});
