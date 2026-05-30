# syntax=docker/dockerfile:1.7
# Multi-stage: separa instalación de deps (cacheable) de la build,
# reduce uso de disco/memoria en el runner.

FROM node:20-alpine AS deps
WORKDIR /app
# .npmrc carries `legacy-peer-deps=true`, needed because firebase-tools@^15
# (Auth Emulator) conflicts with @angular/fire's peerOptional firebase-tools@^14.
# Without copying it, `npm ci` inside the image runs strict and dies on ERESOLVE
# — which is exactly why the host CI passes but the container build failed.
COPY package*.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-offline

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 3 GB de heap es suficiente para Angular prod y reduce presión de RAM
# en el runner de GitHub Actions (~7 GB total).
ENV NODE_OPTIONS=--max_old_space_size=3072
# `npx ng build` en vez de `npm run build` para SALTAR el hook `prebuild`
# (scripts/write-config.js), que exige las FIREBASE_* y aborta el build: esas
# env solo existen en runtime del contenedor (las inyecta el AppHost), no en
# build. El config.json se materializa al arrancar (ver docker-entrypoint.d).
RUN npx ng build

FROM nginx:alpine
COPY --from=build /app/www /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
# Genera /assets/config.json desde las env de runtime antes de arrancar nginx.
COPY docker-entrypoint.d/40-firebase-config.sh /docker-entrypoint.d/40-firebase-config.sh
RUN chmod +x /docker-entrypoint.d/40-firebase-config.sh
EXPOSE 80
