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
  // The BOM is referenced via its escape so ESLint's no-irregular-whitespace
  // does not trip on an invisible source character.
  const connectionString = rawUri.replace(/^\uFEFF/, '').trim();

  // Safe diagnostic — surface hidden characters WITHOUT leaking credentials.
  // Hex of the first 6 bytes is enough to spot a BOM (ef bb bf) versus a
  // clean ASCII start (6d 6f 6e = "mon"). Length delta confirms a strip.
  const head = Buffer.from(rawUri.slice(0, 6), 'utf8').toString('hex');
  console.log(
    `[mongo] env raw_len=${rawUri.length} sanitized_len=${connectionString.length} head_hex=${head}`,
  );

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
