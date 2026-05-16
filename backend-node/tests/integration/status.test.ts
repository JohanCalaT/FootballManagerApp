import request from 'supertest';
import app from '../../src/app';
import { PlayerModel } from '../../src/models/player.model';
import { resetRequestCounter } from '../../src/services/status.service';
import { buildPlayer, seedPlayerWithComments, seedPlayers } from '../helpers/seed';

describe('GET /status (panel Pug — matrícula TRWM)', () => {
  beforeEach(() => resetRequestCounter());

  describe('renderiza HTML aunque la BD esté vacía', () => {
    it('returns 200 + text/html with the empty-state message', async () => {
      const res = await request(app).get('/status');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
      expect(res.text).toContain('FootballManagerApp · Node Backend');
      expect(res.text).toContain('No hay jugadores aún');
    });

    it('shows MongoDB connected status', async () => {
      const res = await request(app).get('/status');
      expect(res.text).toContain('Conectado');
    });
  });

  describe('métricas con datos reales', () => {
    it('counts players and rolls up nested comments via aggregate', async () => {
      await seedPlayerWithComments(3); // 1 player con 3 comments
      await seedPlayerWithComments(2); // 1 player con 2 comments
      await PlayerModel.create(buildPlayer({ name: 'Sin comments' })); // 1 player sin comments

      const res = await request(app).get('/status');

      expect(res.status).toBe(200);
      // 3 players, 5 comments totales
      expect(res.text).toMatch(/Jugadores[\s\S]*?>3</);
      expect(res.text).toMatch(/Comentarios[\s\S]*?>5</);
    });

    it('shows the 5 most recent players in the table', async () => {
      await seedPlayers(8);

      const res = await request(app).get('/status');

      // Los 5 más recientes (Player 00..04) — el seed los ordena por registeredAt desc
      expect(res.text).toContain('Player 00');
      expect(res.text).toContain('Player 04');
      // Player 05 y siguientes NO aparecen
      expect(res.text).not.toContain('Player 05');
    });

    it('formats registeredAt as YYYY-MM-DD HH:MM:SS', async () => {
      await PlayerModel.create(buildPlayer({
        name: 'Fixed Date Player',
        registeredAt: new Date('2026-05-15T18:30:45.123Z'),
      }));

      const res = await request(app).get('/status');

      expect(res.text).toContain('2026-05-15 18:30:45');
    });
  });

  describe('contador de peticiones', () => {
    it('shows requestsToday incrementing with each request', async () => {
      // Tras el reset, hago N peticiones y verifico que el counter sube
      await request(app).get('/status'); // 1
      await request(app).get('/status'); // 2
      const res = await request(app).get('/status'); // 3

      // 3 peticiones contadas; el panel muestra "3" en la tarjeta Peticiones
      expect(res.text).toMatch(/Peticiones[\s\S]*?>3</);
    });

    it('counts requests to other endpoints too', async () => {
      await request(app).get('/api/players'); // 1
      await request(app).get('/api/players'); // 2
      const res = await request(app).get('/status'); // 3

      expect(res.text).toMatch(/Peticiones[\s\S]*?>3</);
    });
  });
});
