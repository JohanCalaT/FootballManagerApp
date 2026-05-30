#!/bin/sh
# Materialize the runtime Firebase config the SPA fetches at /assets/config.json.
#
# The Angular bundle is environment-agnostic: src/main.ts fetches this file at
# runtime, so the SAME image serves dev/staging/prod and only the env vars
# change. The Aspire AppHost injects FIREBASE_* as CONTAINER env (WithEnvironment),
# which only exists at runtime — not during `docker build` — so we write the file
# here instead of baking it in. nginx:alpine runs every executable
# /docker-entrypoint.d/*.sh before starting nginx.
set -e

ASSETS_DIR=/usr/share/nginx/html/assets
mkdir -p "$ASSETS_DIR"

cat > "$ASSETS_DIR/config.json" <<JSON
{
  "firebase": {
    "apiKey": "${FIREBASE_API_KEY}",
    "authDomain": "${FIREBASE_AUTH_DOMAIN}",
    "projectId": "${FIREBASE_PROJECT_ID}",
    "storageBucket": "${FIREBASE_STORAGE_BUCKET}",
    "messagingSenderId": "${FIREBASE_MESSAGING_SENDER_ID}",
    "appId": "${FIREBASE_APP_ID}",
    "measurementId": "${FIREBASE_MEASUREMENT_ID}"
  }
}
JSON

echo "[entrypoint] wrote $ASSETS_DIR/config.json (project=${FIREBASE_PROJECT_ID:-<unset>})"
