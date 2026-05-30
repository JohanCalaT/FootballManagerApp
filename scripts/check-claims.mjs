// Quick verifier — prints custom claims of a given Firebase UID.
// Usage: node scripts/check-claims.mjs <firebase-uid>
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/check-claims.mjs <firebase-uid>');
  process.exit(1);
}

const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
const match = fromEnv
  ?? join(repoRoot, readdirSync(repoRoot).find((n) => /-firebase-adminsdk-.+\.json$/.test(n)));
const serviceAccount = JSON.parse(readFileSync(match, 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const user = await admin.auth().getUser(uid);
console.log(JSON.stringify({
  uid: user.uid,
  email: user.email,
  customClaims: user.customClaims ?? {},
}, null, 2));
process.exit(0);
