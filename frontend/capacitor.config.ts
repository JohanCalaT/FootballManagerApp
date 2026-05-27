import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor identity for the Android (and future iOS) builds.
 *
 * `appId` is the reverse-DNS identifier the OS uses to namespace the install;
 * it must stay stable across releases or users get a fresh install instead of
 * an upgrade. `appName` is the label shown under the launcher icon on the
 * device home screen — keep it short, brand-cased.
 */
const config: CapacitorConfig = {
  appId: 'es.ual.master.footballmanager',
  appName: 'Football Manager',
  webDir: 'www',
};

export default config;
