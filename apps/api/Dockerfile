# syntax=docker/dockerfile:1

# --- Étape 1 : build (dépendances de dev + compilation TypeScript) ---
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Étape 2 : dépendances de production uniquement ---
FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Étape 3 : image finale, légère, sans sources ni outils de build ---
FROM node:24-slim
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
