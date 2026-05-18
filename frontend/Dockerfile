# syntax=docker/dockerfile:1.7
# Multi-stage: separa instalación de deps (cacheable) de la build,
# reduce uso de disco/memoria en el runner.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-offline

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 3 GB de heap es suficiente para Angular prod y reduce presión de RAM
# en el runner de GitHub Actions (~7 GB total).
ENV NODE_OPTIONS=--max_old_space_size=3072
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/www /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
