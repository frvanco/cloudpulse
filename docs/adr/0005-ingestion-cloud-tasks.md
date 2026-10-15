# ADR 0005 — Ingestion quotidienne : Cloud Scheduler + Cloud Tasks (pas Pub/Sub)

- Statut : acceptée
- Date : 2026-10-15

## Contexte

Chaque soir de bourse, CloudPulse doit récupérer les cours journaliers de chaque entreprise
suivie et les historiser (`daily_price`). Contraintes : Twelve Data limite à 8 requêtes par
minute ; chaque entreprise doit pouvoir réussir ou échouer indépendamment ; une relance ne
doit pas créer de doublons.

## Options

| | Scheduler → Cloud Run Job | Scheduler → Pub/Sub → Cloud Run | Scheduler → dispatch → Cloud Tasks → Cloud Run |
|---|---|---|---|
| Débit ≤ 8 req/min | Dans le code | Non maîtrisé (rafales de 429) | Réglage natif de la file |
| Retry par entreprise | Non (job en bloc) | Oui | Oui, backoff configurable |
| Dédoublonnage | Upsert | Upsert (livraison au moins une fois) | Nom de tâche + upsert |

## Décision

Cloud Scheduler déclenche un dispatch qui crée une tâche Cloud Tasks par entreprise ; la
file régule le débit et les retries ; chaque tâche appelle le service d'ingestion.

Le code d'ingestion tourne dans un service Cloud Run séparé, `cloudpulse-ingest`, construit
à partir de la même image que l'API (`APP_MODE=ingest`) : identité et droits séparés, scaling
séparé, routes internes absentes de l'API publique.

Pub/Sub n'est pas retenu : il n'y a qu'un destinataire connu et un besoin de limitation de
débit que Pub/Sub ne couvre pas. Il sera introduit quand un événement aura plusieurs
consommateurs (alertes, phase 8).

## Conséquences

- Les tâches et le Scheduler appellent un service privé avec un jeton OIDC (`run.invoker`).
- Le service d'ingestion a besoin de créer des tâches et d'agir en tant que (`actAs`) le
  service account qui signe les jetons des tâches.
- Le débit de la file doit laisser de la marge pour les appels de l'API publique (même clé).
