import { connectDB } from '../../src/config/database';

// El setup global (tests/setup.ts) ya tiene mongoose conectado a memory-server
// para el resto de los tests. Aquí solo verificamos la guarda de env — sin
// tocar la conexión activa.

describe('connectDB — guarda de env', () => {
  const originalUri   = process.env.MONGODB_URI;
  const originalMongo = process.env.MONGO_URI;

  beforeEach(() => {
    delete process.env.MONGODB_URI;
    delete process.env.MONGO_URI;
  });
  afterAll(() => {
    if (originalUri)   process.env.MONGODB_URI = originalUri;
    if (originalMongo) process.env.MONGO_URI   = originalMongo;
  });

  it('throws when neither MONGODB_URI nor MONGO_URI is defined', async () => {
    await expect(connectDB()).rejects.toThrow(/MONGODB_URI/);
  });

  it('throws when called with explicit empty string and env empty', async () => {
    await expect(connectDB('')).rejects.toThrow(/MONGODB_URI/);
  });
});
