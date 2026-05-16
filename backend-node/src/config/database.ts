import mongoose from 'mongoose';

const RETRY_INTERVAL_MS = 5_000;
const MAX_RETRIES = 5;

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  const connectionString = uri ?? process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!connectionString) {
    throw new Error('MONGODB_URI no definida — revisa tu .env');
  }

  let attempt = 0;
  // Retry simple con backoff fijo — production-grade es Polly-like pero excesivo aquí.
  for (;;) {
    try {
      const conn = await mongoose.connect(connectionString);
      console.log(`[mongo] connected to ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      attempt += 1;
      if (attempt >= MAX_RETRIES) {
        console.error(`[mongo] no se pudo conectar tras ${MAX_RETRIES} intentos`, err);
        throw err;
      }
      console.warn(`[mongo] intento ${attempt}/${MAX_RETRIES} falló, reintentando en ${RETRY_INTERVAL_MS}ms`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
