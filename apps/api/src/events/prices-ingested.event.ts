import type { TwelveDataTimeSeriesValue } from '../twelve-data/twelve-data.types.js';

export const PRICES_INGESTED = 'prices.ingested';

// Contrat du message publié sur le topic : ses consommateurs (Cloud Run
// function, abonnement BigQuery) en dépendent. Tous les champs sont
// obligatoires ; les prix restent des chaînes décimales (pas de float).
export interface PricesIngestedEvent {
  // Clé d'idempotence : Pub/Sub livre au moins une fois, un consommateur peut
  // recevoir deux fois le même événement.
  eventId: string;
  symbol: string;
  date: string; // AAAA-MM-JJ, dernier jour ingéré
  close: string;
  previousClose: string; // clôture du jour de cotation précédent
  currency: string;
  ingestedAt: string; // ISO 8601
}

// Construit l'événement du dernier jour de la série. null s'il manque le jour
// précédent : sans lui, aucune variation n'est calculable.
export function buildPricesIngestedEvent(
  symbol: string,
  currency: string,
  values: TwelveDataTimeSeriesValue[],
  now = new Date(),
): PricesIngestedEvent | null {
  const [latest, previous] = [...values].sort((a, b) =>
    b.datetime.localeCompare(a.datetime),
  );
  if (!latest || !previous) return null;

  const date = latest.datetime.slice(0, 10);
  return {
    eventId: `${symbol}-${date}`,
    symbol,
    date,
    close: latest.close,
    previousClose: previous.close,
    currency,
    ingestedAt: now.toISOString(),
  };
}
