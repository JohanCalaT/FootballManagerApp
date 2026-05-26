/**
 * IMPORTANT — `gatewayUrl` is empty ON PURPOSE.
 *
 * The frontend always hits the SAME origin with relative paths
 * (e.g. `/api/players`). The actual gateway URL is resolved at runtime:
 *
 *   - In dev, by `proxy.conf.js`, which reads the env var that Aspire
 *     injects into the npm app (`services__gateway__http__0`).
 *   - In prod (Azure Container Apps), by the ingress in front of the
 *     frontend container.
 *
 * Do NOT hardcode the gateway URL here. If you need to override it from
 * the outside (Capacitor native build, integration tests against a remote
 * env), pass it via build-time replacement.
 */
export const environment = {
  production: false,
  gatewayUrl: '',
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
};
