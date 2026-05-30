export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface AppConfig {
  firebase: FirebaseConfig;
  /**
   * Absolute base URL of the YARP Gateway. Empty on the web build, where the
   * SPA uses relative paths and nginx reverse-proxies /api + /config to the
   * Gateway (same-origin, no CORS). The Capacitor APK has no proxy, so its
   * config.json carries the absolute staging Gateway URL here and the app
   * calls it directly (the Gateway enables CORS for that). Optional so a
   * config.json without it still falls back to relative paths.
   */
  gatewayUrl?: string;
}
