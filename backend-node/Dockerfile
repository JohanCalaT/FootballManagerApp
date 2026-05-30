# syntax=docker/dockerfile:1.6

# ── Build stage ─────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
# Copy manifests first to leverage Docker layer cache: deps reinstall
# only when package.json or lockfile actually change.
COPY package*.json ./
# `npm ci` enforces an exact lockfile match (deterministic builds)
# and fails fast if the lockfile drifted (same guarantee CI gives us).
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package*.json ./
# Only production deps — no dev tooling in the runtime image.
RUN npm ci --omit=dev && npm cache clean --force
EXPOSE 3000
CMD ["node", "dist/server.js"]
