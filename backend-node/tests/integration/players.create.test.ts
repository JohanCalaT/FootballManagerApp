import request from 'supertest';
import app from '../../src/app';
import { PlayerModel } from '../../src/models/player.model';

const validBody = {
  name:   'Pedri González',
  team:   'FC Barcelona',
  league: 'La Liga',
};

describe('POST /api/players', () => {
  describe('happy path', () => {
    it('returns 201 with Location header and ApiResponse<PlayerDetailDto>', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Jugador creado');
      expect(res.body.data.id).toMatch(/^[a-f0-9]{24}$/i);
      expect(res.body.data.name).toBe('Pedri González');
      expect(res.body.data.createdByUserId).toBe('uid-test');
      expect(res.body.data.statistics).toEqual([]);
      expect(res.body.data.comments).toEqual([]);
      expect(res.headers.location).toBe(`/api/players/${res.body.data.id}`);
      expect(res.body._links.self.href).toBe(`/api/players/${res.body.data.id}`);
    });

    it('persists optional fields when provided', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({
          ...validBody,
          name:         'Lamine Yamal',
          firstName:    'Lamine',
          lastName:     'Yamal',
          nationality:  'Spain',
          birthDate:    '2007-07-13',
          birthPlace:   'Mataró',
          birthCountry: 'Spain',
          height:       '180 cm',
          weight:       '72 kg',
          injured:      false,
          position:     'Attacker',
          shirtNumber:  19,
          imageUrl:     'https://cdn/yamal.png',
          imageSource:  'url',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.firstName).toBe('Lamine');
      expect(res.body.data.position).toBe('Attacker');
      expect(res.body.data.shirtNumber).toBe(19);
      // Verifica que persistió en BD, no solo en la respuesta
      const reloaded = await PlayerModel.findById(res.body.data.id).lean();
      expect(reloaded?.imageSource).toBe('url');
    });

    it('persists clientGeolocation from X-Client-* headers', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .set('X-Client-Lat',     '41.38')
        .set('X-Client-Lng',     '2.18')
        .set('X-Client-City',    'Barcelona')
        .set('X-Client-Country', 'Spain')
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.data.clientGeolocation).toEqual({
        lat: 41.38, lng: 2.18, city: 'Barcelona', country: 'Spain',
      });
    });

    it('ignores partial geo (only lat without lng)', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .set('X-Client-Lat', '41.38')
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.data.clientGeolocation).toBeNull();
    });
  });

  describe('autenticación', () => {
    it('returns 401 without X-User-Id', async () => {
      const res = await request(app).post('/api/players').send(validBody);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no autorizado/i);
      expect(await PlayerModel.countDocuments()).toBe(0);
    });

    it('returns 401 with empty X-User-Id', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', '')
        .send(validBody);

      expect(res.status).toBe(401);
    });
  });

  describe('validación del body', () => {
    it('returns 400 without name', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ team: 'FC Barcelona', league: 'La Liga' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name/i);
    });

    it('returns 400 without team', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ name: 'Pedri', league: 'La Liga' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/team/i);
    });

    it('returns 400 without league', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ name: 'Pedri', team: 'FC Barcelona' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/league/i);
    });

    it('returns 400 with empty string name', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ ...validBody, name: '   ' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when position is not in enum', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ ...validBody, position: 'Coach' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/position/i);
    });

    it('returns 400 when shirtNumber > 99', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ ...validBody, shirtNumber: 150 });

      expect(res.status).toBe(400);
    });

    it('returns 400 when birthDate is not ISO 8601', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ ...validBody, birthDate: 'tomorrow' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when imageSource is not in enum', async () => {
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ ...validBody, imageSource: 'ftp' });

      expect(res.status).toBe(400);
    });
  });

  describe('soft uniqueness', () => {
    it('returns 409 when a manual Player with same name+team already exists', async () => {
      await PlayerModel.create({ ...validBody, createdByUserId: 'uid-first' });

      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/ya existe/i);
      expect(await PlayerModel.countDocuments()).toBe(1); // no duplicó
    });

    it('matches uniqueness case-insensitively and ignoring accents', async () => {
      await PlayerModel.create({
        name: 'Pedri González', team: 'FC Barcelona', league: 'La Liga',
        createdByUserId: 'uid-first',
      });

      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ name: 'pedri gonzalez', team: 'FC BARCELONA', league: 'La Liga' });

      expect(res.status).toBe(409);
    });

    it('allows the SAME name in a DIFFERENT team', async () => {
      await PlayerModel.create({
        name: 'Pedri González', team: 'FC Barcelona', league: 'La Liga',
        createdByUserId: 'uid-first',
      });

      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ name: 'Pedri González', team: 'PSG', league: 'Ligue 1' });

      expect(res.status).toBe(201);
      expect(await PlayerModel.countDocuments()).toBe(2);
    });

    it('does NOT apply soft uniqueness when apiFootballId is provided', async () => {
      // Para imports, la unicidad la da el índice partial UNIQUE en apiFootballId,
      // no el soft check de name+team.
      await PlayerModel.create({
        name: 'L. Messi', team: 'PSG', league: 'Ligue 1',
        createdByUserId: 'u', apiFootballId: 154,
      });

      // Mismo name+team pero distinto apiFootballId — el soft check no aplica
      const res = await request(app)
        .post('/api/players')
        .set('X-User-Id', 'uid-test')
        .send({ name: 'L. Messi', team: 'PSG', league: 'Ligue 1', apiFootballId: 999 });

      expect(res.status).toBe(201);
    });
  });
});
