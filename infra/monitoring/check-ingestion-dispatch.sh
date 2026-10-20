#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-cloudpulse-001}"

LAST_DISPATCH="$(gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="cloudpulse-ingest"
   AND jsonPayload.event="ingestion.dispatch"' \
  --project="$PROJECT_ID" \
  --freshness=26h \
  --order=desc \
  --limit=1 \
  --format='value(timestamp)')"

if [ -n "$LAST_DISPATCH" ]; then
  printf '{"severity":"INFO","event":"ingestion.watchdog.ok","message":"Un dispatch existe dans les 26 dernieres heures","lastDispatch":"%s"}\n' \
    "$LAST_DISPATCH"
else
  printf '{"severity":"ERROR","event":"ingestion.watchdog.missing","message":"Aucun dispatch trouve dans les 26 dernieres heures"}\n'
fi
