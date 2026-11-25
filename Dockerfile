# syntax=docker/dockerfile:1

# ---- build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Build-time configuration (optional).
ARG VITE_GITHUB_URL=""
ENV VITE_GITHUB_URL=$VITE_GITHUB_URL

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Refresh the item mirror at build time so the image ships with usable data.
# This never touches api.warframe.com; it only reads WFCD's public dataset.
RUN npm run sync:items && npm run sync:game-data

RUN npm run build

# ---- runtime stage ---------------------------------------------------------
FROM caddy:2.8-alpine

COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

# The daily sync container writes /srv/data; the seed copy is already in /srv.
VOLUME ["/data", "/config"]

EXPOSE 80 443 443/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:2019/config/ >/dev/null 2>&1 || exit 1
