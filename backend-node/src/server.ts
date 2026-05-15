import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/database';

const PORT = process.env.PORT ?? 3000;

// Redirect raíz → Swagger
app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'node-backend' }));

const start = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
