import request from 'supertest';
import app from '../../src/app';
import { PlayerModel } from '../../src/models/player.model';
import * as geminiService from '../../src/services/gemini.service';

jest.mock('../../src/services/gemini.service');
const mockedGenerate = geminiService.generateIdealTeam as jest.MockedFunction<
  typeof geminiService.generateIdealTeam
>;

const seedEleven = async () => {
  const positions: Array<'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'> = [
    'Goalkeeper',
    'Defender', 'Defender', 'Defender', 'Defender',
    'Midfielder', 'Midfielder', 'Midfielder',
    'Attacker', 'Attacker', 'Attacker',
  ];
  const docs = await Promise.all(positions.map((pos, i) =>
    PlayerModel.create({
      name: `P${i}`, team: `T${i}`, league: 'La Liga',
      position: pos, createdByUserId: 'uid-1',
      statistics: [{ season: 2024, rating: 7.0, goals: 1, assists: 1, appearances: 10 }],
    }),
  ));
  return docs.map((d) => d._id.toString());
};

const fakeResponse = (ids: string[]) => ({
  formation: '4-3-3',
  goalkeeper: {
    id: ids[0], name: 'P0', team: 'T0', position: 'GK',
    x: 0.5, y: 0.05, reason: 'gk',
  },
  defenders: ids.slice(1, 5).map((id, i) => ({
    id, name: `P${i + 1}`, team: `T${i + 1}`, position: 'CB',
    x: 0.2 + 0.2 * i, y: 0.2, reason: 'd',
  })),
  midfielders: ids.slice(5, 8).map((id, i) => ({
    id, name: `P${i + 5}`, team: `T${i + 5}`, position: 'CM',
    x: 0.25 + 0.25 * i, y: 0.5, reason: 'm',
  })),
  attackers: ids.slice(8, 11).map((id, i) => ({
    id, name: `P${i + 8}`, team: `T${i + 8}`, position: 'ST',
    x: 0.25 + 0.25 * i, y: 0.8, reason: 'a',
  })),
  generalJustification: 'great team',
});

describe('POST /api/ideal-team', () => {
  beforeEach(() => mockedGenerate.mockReset());

  it('returns 401 without X-User-Id', async () => {
    const res = await request(app)
      .post('/api/ideal-team')
      .send({ formation: '4-3-3' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when formation is missing', async () => {
    const res = await request(app)
      .post('/api/ideal-team')
      .set('X-User-Id', 'u')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/formation/i);
  });

  it('returns 400 when formation is invalid', async () => {
    const res = await request(app)
      .post('/api/ideal-team')
      .set('X-User-Id', 'u')
      .send({ formation: '9-9-9' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when less than 11 players in DB', async () => {
    await PlayerModel.create({
      name: 'X', team: 'T', league: 'L',
      position: 'Goalkeeper', createdByUserId: 'u',
    });
    const res = await request(app)
      .post('/api/ideal-team')
      .set('X-User-Id', 'u')
      .send({ formation: '4-3-3' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/mínimo 11/);
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it('returns 503 when Gemini fails', async () => {
    await seedEleven();
    mockedGenerate.mockRejectedValue(
      new (await import('../../src/errors/domain.errors')).GeminiUnavailableError(
        'down'));
    const res = await request(app)
      .post('/api/ideal-team')
      .set('X-User-Id', 'u')
      .send({ formation: '4-3-3' });
    expect(res.status).toBe(503);
  });

  it('returns 503 when Gemini returns invalid JSON', async () => {
    await seedEleven();
    mockedGenerate.mockResolvedValue('not-json');
    const res = await request(app)
      .post('/api/ideal-team')
      .set('X-User-Id', 'u')
      .send({ formation: '4-3-3' });
    expect(res.status).toBe(503);
  });

  it('returns 503 when Gemini returns unknown player id', async () => {
    await seedEleven();
    mockedGenerate.mockResolvedValue(JSON.stringify(fakeResponse(
      Array.from({ length: 11 }, (_, i) =>
        new (jest.requireActual('mongoose')).Types.ObjectId().toString()))));
    const res = await request(app)
      .post('/api/ideal-team')
      .set('X-User-Id', 'u')
      .send({ formation: '4-3-3' });
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/unknown/);
  });

  it('returns 200 with players grouped by line and self link', async () => {
    const ids = await seedEleven();
    mockedGenerate.mockResolvedValue(JSON.stringify(fakeResponse(ids)));

    const res = await request(app)
      .post('/api/ideal-team')
      .set('X-User-Id', 'u')
      .send({ formation: '4-3-3' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Equipo Ideal generado correctamente');
    expect(res.body.data.formation).toBe('4-3-3');
    expect(res.body.data.goalkeeper.id).toBe(ids[0]);
    expect(res.body.data.defenders).toHaveLength(4);
    expect(res.body.data.midfielders).toHaveLength(3);
    expect(res.body.data.attackers).toHaveLength(3);
    expect(res.body._links.self).toEqual({
      href: '/api/ideal-team', rel: 'self', method: 'POST',
    });
  });
});
