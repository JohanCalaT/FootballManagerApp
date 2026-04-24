import request from 'supertest';
import app from '../../src/app';

describe('PlayerController', () => {
  describe('GET /api/players', () => {
    it('should return 200 OK and players message', async () => {
      const response = await request(app).get('/api/players');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Players OK' });
    });
  });
});
