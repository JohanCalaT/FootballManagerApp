import mongoose from 'mongoose';

const RETRY_INTERVAL_MS = 5_000;
const MAX_RETRIES = 5;

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  const rawUri = uri ?? process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!rawUri) {
    throw new Error('MONGODB_URI no definida — revisa tu .env');
  }

  // Strip BOM (U+FEFF) and surrounding whitespace that paste-into-portal
  // workflows sometimes inject when secrets are copied from rich editors.
  // Without this, mongoose throws "Invalid scheme, expected ... mongodb://"
  // even though the value looks correct in the Azure portal UI.
  const connectionString = rawUri.replace(/^﻿/, '').trim();

  // TEMPORARY DIAGNOSTIC — log the full URI on startup to surface any
  // hidden characters. The Mongo Atlas password will be rotated once the
  // root cause is confirmed, so leaking it briefly in container logs is
  // acceptable here. REMOVE this block before any production deploy.
  console.log('[mongo] raw env length:', rawUri.length);
  console.log('[mongo] sanitized length:', connectionString.length);
  console.log('[mongo] first 12 chars (hex):',
    Buffer.from(rawUri.slice(0, 12), 'utf8').toString('hex'));
  console.log('[mongo] full URI (DIAGNOSTIC — rotate password after):',
    connectionString);

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
