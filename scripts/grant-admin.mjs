// Promote a Firebase user to admin by setting the `admin: true` custom claim.
//
// Usage:  node scripts/grant-admin.mjs <firebase-uid>
//
// Resolves the service account JSON in this order:
//   1. $FIREBASE_SERVICE_ACCOUNT  (absolute path)
//   2. The first `*-firebase-adminsdk-*.json` file at the repo root.
//
// The new claim only takes effect once the user's ID token is refreshed —
// either let it expire (~1h) or call AuthService.refreshToken() on the
// frontend after promotion.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/grant-admin.mjs <firebase-uid>');
  process.exit(1);
}

function locateServiceAccount() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (fromEnv) return fromEnv;
  const match = readdirSync(repoRoot).find(
    (name) => /-firebase-adminsdk-.+\.json$/.test(name),
  );
  if (!match) {
    throw new Error(
      'No service account JSON found. Set FIREBASE_SERVICE_ACCOUNT or place ' +
        'the file as *-firebase-adminsdk-*.json at the repo root.',
    );
  }
  return join(repoRoot, match);
}

const credentialsPath = locateServiceAccount();
const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const user = await admin.auth().getUser(uid);
const existingClaims = user.customClaims ?? {};

if (existingClaims.admin === true) {
  console.log(`User ${uid} (${user.email ?? 'no email'}) is already admin. Nothing to do.`);
  process.exit(0);
}

await admin.auth().setCustomUserClaims(uid, { ...existingClaims, admin: true });
console.log(`Granted admin to ${uid} (${user.email ?? 'no email'}).`);
console.log('The user must sign out and sign in (or call refreshToken) to pick up the new claim.');
process.exit(0);
