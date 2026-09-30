# Architecture V1 (locale)

Objectif : une version entièrement locale, sans aucun service Google Cloud, simple à comprendre.

## Vue d'ensemble

```
SvelteKit (apps/web)
   │  HTTP/JSON, appels depuis les load functions serveur (+page.server.ts)
   ▼
NestJS REST API (apps/api) ──────▶ Twelve Data (API externe)
   │  Prisma
   ▼
PostgreSQL (Docker Compose)
```

Principes :

- **API stateless** : aucun état en mémoire ou sur disque local, tout est dans PostgreSQL
  (prérequis pour Cloud Run).
- **Configuration par variables d'environnement** (12-factor). Aucun secret dans Git ;
  `.env.example` ne contient que les noms des variables.
- **Provider abstrait** : l'API externe est derrière une interface `MarketDataProvider`,
  implémentée par `TwelveDataProvider`. Permet de changer de fournisseur et de mocker en test.
- **Cache-aside** : l'API lit d'abord PostgreSQL, n'appelle Twelve Data que si la donnée est
  absente ou périmée, puis persiste le résultat.
- **Écritures idempotentes** : upsert et contraintes d'unicité, rejouer une écriture ne crée
  pas de doublon.

## Structure du repository

```
apps/api/      NestJS + Prisma
apps/web/      SvelteKit
docs/          architecture et ADR
docker-compose.yml   PostgreSQL uniquement
.env.example
```

## Modèle de données

| Table | Rôle | Points clés |
|---|---|---|
| `Company` | Données de référence (quasi statiques) | `symbol` unique |
| `DailyPrice` | Historique journalier OHLCV (append-only) | unique `(companyId, date)`, prix en `NUMERIC` |
| `Quote` | Dernier cours connu, 1 ligne par entreprise | PK = `companyId`, upsert, `fetchedAt` sert de TTL |
| `WatchlistItem` | (V1.1) Entreprises suivies | pas d'utilisateur en V1 |

Voir [ADR 0002](adr/0002-modele-de-donnees.md).

## Endpoints REST

| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/companies/search?q=` | Proxy vers la recherche du provider (non persisté) |
| GET | `/companies/:symbol` | Détail ; upsert en base au premier accès |
| GET | `/companies/:symbol/quote` | Cours actuel, cache TTL ~5 min |
| GET | `/companies/:symbol/history?range=1M\|6M\|1Y\|5Y` | Historique journalier |

## Flux de données

**Recherche** : web → `GET /companies/search` → provider → DTO → web. Rien n'est stocké.

**Cours actuel** : lecture de `Quote` ; si `fetchedAt` < TTL, on la renvoie, sinon appel du
provider, upsert, réponse.

**Historique** : lecture de la dernière `DailyPrice.date` ; si incomplet, appel du provider
pour les jours manquants uniquement, insertion en masse avec `skipDuplicates`, puis lecture
en base.

**Erreurs provider** (429, 5xx) : si une donnée plus ancienne existe, on la renvoie avec
`stale: true` (dégradation gracieuse) ; sinon erreur explicite.

## Hors périmètre V1

Déploiement Google Cloud, Terraform, Pub/Sub, Cloud Scheduler, Cloud Build, notifications.
