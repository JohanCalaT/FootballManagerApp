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
# El dep @football-manager/stencil es un `file:./stencil` que npm instala
# como SYMLINK (node_modules/@football-manager/stencil -> ../../stencil).
# Su salida (`dist/` + `loader/`) está en .gitignore, así que en un checkout
# limpio de CI NO existe, y `npm ci` no la regenera (no corre el `prepare`
# de un dep enlazado). Sin `loader/`, `ng build` no resuelve el import
# `@football-manager/stencil/loader` en src/main.ts y aborta. Lo compilamos
# aquí dentro: stencil.config.ts emite dist-custom-elements (loader) + dist.
RUN cd stencil \
    && npm ci --no-audit --no-fund --prefer-offline \
    && npm run build
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
# nginx.conf es un TEMPLATE: Aspire/ACA inyectan el puerto de ingress vía $PORT
# (AppHost: ionic-app WithHttpEndpoint(env: "PORT")). El contenedor DEBE escuchar
# en ese puerto o el StartUp probe de ACA falla (status 1) y no llega tráfico.
# 05-listen-port.sh renderiza la config real antes de arrancar nginx. Default 80
# para `docker run` local sin PORT (ACA lo sobrescribe).
ENV PORT=80
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY docker-entrypoint.d/05-listen-port.sh /docker-entrypoint.d/05-listen-port.sh
# Genera /assets/config.json desde las env de runtime antes de arrancar nginx.
COPY docker-entrypoint.d/40-firebase-config.sh /docker-entrypoint.d/40-firebase-config.sh
RUN chmod +x /docker-entrypoint.d/05-listen-port.sh /docker-entrypoint.d/40-firebase-config.sh
EXPOSE 80
