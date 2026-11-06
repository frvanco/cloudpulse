# ADR 0009 — Cluster GKE Autopilot pour CloudPulse

## Décision

Créer un cluster GKE Autopilot régional en europe-west9 pour les exercices
CloudPulse. Il utilise le canal Regular, un compte de service dédié aux nœuds
et le module Secret Manager. Terraform protège le cluster contre la
suppression accidentelle avec `deletion_protection = true`.

## Réseau

Le cluster utilise le VPC et le sous-réseau `default`. Les nœuds disposent
d'adresses IP publiques pour permettre les sorties vers Internet, notamment
vers Twelve Data, sans créer de Cloud NAT.

Ce choix simplifie l'exercice et évite le coût d'un Cloud NAT dédié, mais
augmente l'exposition réseau par rapport à des nœuds privés. Il doit être
réévalué pour un environnement de production.

## Durée de vie et coûts

Le cluster est temporaire. Après les exercices, passer
`deletion_protection` à `false`, appliquer ce changement, puis supprimer le
cluster par Terraform. Vérifier aussi les ressources et coûts associés.
