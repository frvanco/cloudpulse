# ADR 0002 — Modèle de données V1

- Statut : acceptée
- Date : 2026-09-30

## Contexte

Il faut stocker des données de nature différente : référence (entreprise), dernier cours
(très volatile) et historique (append-only).

## Options pour le cours actuel

1. Colonnes dans `Company` : simple, mais mélange référence et données volatiles.
2. Une ligne insérée à chaque appel : historique complet mais croissance inutile en V1.
3. Table `Quote` 1:1 avec upsert : séparation claire, `fetchedAt` sert directement de cache.

## Décision

Trois tables : `Company`, `DailyPrice`, `Quote` (option 3). `WatchlistItem` en V1.1.

## Conséquences

- Prix en `NUMERIC` (`Decimal` Prisma), jamais en flottant.
- Contrainte d'unicité `(companyId, date)` sur `DailyPrice` : insertions idempotentes.
- Timestamps en UTC.
