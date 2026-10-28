import { cloudEvent, type CloudEvent } from '@google-cloud/functions-framework';
import {
  analyze,
  decodeEvent,
  type MessagePublishedData,
} from './price-move.js';

// Seuil de variation (en %) au-delà duquel un mouvement est signalé.
const threshold = Number(process.env.MOVE_THRESHOLD_PERCENT ?? '5');
if (!(threshold > 0)) {
  throw new Error('MOVE_THRESHOLD_PERCENT must be a positive number');
}

// Une ligne JSON sur stdout = une entrée Cloud Logging structurée.
function log(severity: 'INFO' | 'WARNING', fields: Record<string, unknown>) {
  console.log(JSON.stringify({ severity, message: fields.event, ...fields }));
}

// Déclenchée par Eventarc à chaque message du topic des cours ingérés.
// Idempotente : un message livré deux fois produit deux logs identiques
// (même eventId), sans autre effet.
cloudEvent('detectPriceMove', (ce: CloudEvent<MessagePublishedData>) => {
  const event = decodeEvent(ce.data ?? {});
  const { changePercent, isMove } = analyze(event, threshold);

  log(isMove ? 'WARNING' : 'INFO', {
    event: isMove ? 'price.move' : 'price.checked',
    eventId: event.eventId,
    symbol: event.symbol,
    date: event.date,
    close: event.close,
    previousClose: event.previousClose,
    changePercent,
    thresholdPercent: threshold,
    messageId: ce.data?.message?.messageId,
  });
});
