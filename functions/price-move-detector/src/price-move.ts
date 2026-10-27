// Contrat publié par cloudpulse-ingest (apps/api/src/events/prices-ingested.event.ts).
export interface PricesIngestedEvent {
  eventId: string;
  symbol: string;
  date: string;
  close: string;
  previousClose: string;
  currency: string;
  ingestedAt: string;
}

// Forme de event.data d'un CloudEvent Eventarc
// google.cloud.pubsub.topic.v1.messagePublished.
export interface MessagePublishedData {
  message?: {
    data?: string; // corps du message, encodé en base64
    attributes?: Record<string, string>;
    messageId?: string;
  };
  subscription?: string;
}

export interface PriceMove {
  changePercent: number;
  isMove: boolean;
}

// Message illisible : réessayer ne le rendra pas valide. L'erreur fait échouer
// la livraison ; après N tentatives, Pub/Sub le range dans le dead-letter topic.
export class InvalidEventError extends Error {}

const STRING_FIELDS = [
  'eventId',
  'symbol',
  'date',
  'close',
  'previousClose',
  'currency',
  'ingestedAt',
] as const;

export function decodeEvent(data: MessagePublishedData): PricesIngestedEvent {
  const encoded = data.message?.data;
  if (!encoded) throw new InvalidEventError('Empty Pub/Sub message');

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw new InvalidEventError('Message body is not JSON');
  }
  if (typeof payload !== 'object' || payload === null) {
    throw new InvalidEventError('Message body is not an object');
  }

  const record = payload as Record<string, unknown>;
  for (const field of STRING_FIELDS) {
    if (typeof record[field] !== 'string') {
      throw new InvalidEventError(`Missing or invalid field: ${field}`);
    }
  }
  return record as unknown as PricesIngestedEvent;
}

export function analyze(
  event: PricesIngestedEvent,
  thresholdPercent: number,
): PriceMove {
  const close = Number(event.close);
  const previousClose = Number(event.previousClose);
  if (!Number.isFinite(close) || !(previousClose > 0)) {
    throw new InvalidEventError('Invalid prices');
  }

  const changePercent =
    Math.round(((close - previousClose) / previousClose) * 10_000) / 100;
  return {
    changePercent,
    isMove: Math.abs(changePercent) >= thresholdPercent,
  };
}
