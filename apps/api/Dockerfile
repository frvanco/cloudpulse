# syntax=docker/dockerfile:1

# --- Étape 1 : build (dépendances de dev + compilation TypeScript) ---
FROM node:24-slim AS build
WORKDIR /app
# Schéma et config Prisma avant npm ci : le postinstall génère le client.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

# --- Étape 2 : dépendances de production uniquement ---
FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=optional : le CLI prisma est une peer dependency *optionnelle* de
# @prisma/client (devOptional dans le lockfile) ; inutile au runtime.
# --ignore-scripts : pas de prisma generate ici, le client est déjà dans dist/.
RUN npm ci --omit=dev --omit=optional --ignore-scripts

# --- Cible « migrate » : applique les migrations Prisma (Cloud Run Job) ---
# docker build --target migrate ... ; reçoit DATABASE_URL comme l'API.
FROM node:24-slim AS migrate
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/prisma ./prisma
# Prisma avertit « failed to detect the libssl/openssl version » : sans effet ici,
# la connexion passe par le socket Unix de Cloud SQL (pas de TLS côté Prisma).
# À revoir si DATABASE_URL utilise un jour sslmode=require.
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

# --- Image finale (cible par défaut, doit rester la dernière) : l'API ---
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Utilisateur non-root fourni par l'image officielle Node.
USER node
# Documentation uniquement : Cloud Run fournit PORT (8080 par défaut).
EXPOSE 8080
CMD ["node", "dist/main.js"]
