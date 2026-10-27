# ADR 0007 — Événements : Pub/Sub, Eventarc et Cloud Run functions

- Statut : acceptée
- Date : 2026-10-27

## Contexte

Une fois les cours d'une entreprise ingérés, plusieurs traitements indépendants doivent
réagir : détecter une forte variation, archiver l'événement pour analyse, d'autres plus tard.
L'ADR 0005 prévoyait d'introduire Pub/Sub dès qu'un événement aurait plusieurs consommateurs.

## Décisions

1. **Topic `prices-ingested`** : `cloudpulse-ingest` publie un message par entreprise
   ingérée (dernier jour, avec la clôture précédente). Le producteur ignore qui consomme.
   Attributs : `eventType`, `eventId`, `symbol` (filtrables sans lire le corps).
2. **Publication après l'écriture en base**, hors transaction. Si elle échoue, l'endpoint
   répond 503 et Cloud Tasks rejoue la tâche : l'upsert réécrit les mêmes lignes et le
   message est republié. Le *transactional outbox* (écrire l'événement dans la même
   transaction, un relais le publie ensuite) supprimerait cette fenêtre ; il n'est pas
   implémenté.
3. **Livraison au moins une fois** : chaque consommateur est idempotent (clé `eventId`).
4. **Consommateur 1 : Cloud Run function `price-move-detector`**, déclenchée par Eventarc.
   Sans état : le message contient `previousClose`, la fonction n'accède pas à Cloud SQL.
   Elle logue `price.move` au-delà d'un seuil (5 % par défaut) : métrique basée sur les
   logs et alerte, comme en phase 6.
5. **Consommateur 2 : abonnement BigQuery**, sans code.
6. **Messages illisibles** : la fonction échoue (5xx), Pub/Sub réessaie puis range le
   message dans un *dead-letter topic*, où il reste consultable.
7. Sans `EVENTS_TOPIC`, l'ingestion ne publie rien (développement local, tests).

## Options écartées

- **Appels directs** de l'ingestion vers chaque traitement : couplage, chaque nouveau
  consommateur modifie le producteur.
- **Cloud Tasks** : un destinataire explicite par tâche, pas de *fan-out*.
- **Lecture de Cloud SQL par la fonction** : connexion et droits en plus pour une donnée
  déjà connue du producteur.

## Conséquences

- Le contrat du message (`apps/api/src/events/prices-ingested.event.ts`) est partagé par
  plusieurs équipes potentielles : le faire évoluer de façon compatible (ajout de champs),
  éventuellement le figer par un schéma Pub/Sub.
- Un même événement peut être traité deux fois : les effets des consommateurs doivent le
  supporter.
