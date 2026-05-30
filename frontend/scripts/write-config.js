/**
 * Materialize runtime config into src/assets/config.json before Ionic starts.
 *
 * Aspire AppHost injects FIREBASE_* env vars into this npm app (see
 * src/FootballManagerApp/FootballManagerApp.AppHost/AppHost.cs). The Angular
 * bootstrap reads /assets/config.json at runtime, so the same compiled bundle
 * works in dev, staging, and prod without rebuilding — only the env changes.
 *
 * Run as the `prestart` script. The generated config.json is gitignored.
 */
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(
    '[write-config] Missing required env vars: ' + missing.join(', ') + '\n' +
    'These are injected by the Aspire AppHost. If you are running `npm start`\n' +
    'directly, run the AppHost instead, or set them manually in your shell.',
  );
  process.exit(1);
}

const config = {
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
  },
  // Empty on the web build (relative paths → nginx proxies /api + /config to
  // the Gateway). The Capacitor APK build sets GATEWAY_URL to the absolute
  // staging Gateway URL so the installed app reaches the backend directly.
  gatewayUrl: process.env.GATEWAY_URL || '',
};

const outDir = path.resolve(__dirname, '..', 'src', 'assets');
const outFile = path.join(outDir, 'config.json');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(config, null, 2) + '\n', 'utf8');

console.log('[write-config] Wrote ' + outFile);
