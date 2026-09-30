# ADR 0001 — Choix de l'API de données financières

- Statut : acceptée
- Date : 2026-09-30

## Contexte

La V1 a besoin de trois fonctionnalités : recherche de symboles, cours actuel, historique
journalier. Budget : offre gratuite.

## Options étudiées

| | Twelve Data | Alpha Vantage | Finnhub |
|---|---|---|---|
| Recherche | oui | oui | oui |
| Cours actuel | oui | oui | oui |
| Historique journalier | oui | oui (non ajusté) | payant |
| Limites gratuites | 8 req/min, 800 req/jour | 25 req/jour | ~60 req/min |

## Décision

**Twelve Data**, seule offre gratuite couvrant les trois besoins avec un quota journalier
suffisant pour le développement.

## Conséquences

- Les limites par minute imposent un cache en base (cache-aside) et une gestion des erreurs 429.
- L'intégration passe par une interface `MarketDataProvider` pour pouvoir basculer vers
  Alpha Vantage ou un autre fournisseur si l'offre change.
- La clé API est fournie par variable d'environnement, jamais commitée.
