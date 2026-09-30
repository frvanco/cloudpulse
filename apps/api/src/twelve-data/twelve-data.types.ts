// Formats bruts renvoyés par Twelve Data (https://twelvedata.com/docs).
// Les valeurs numériques arrivent sous forme de chaînes.

export interface TwelveDataQuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
  previous_close: string;
  change: string;
  percent_change: string;
  is_market_open: boolean;
}

// Twelve Data peut renvoyer une erreur avec un statut HTTP 200 :
// il faut inspecter le corps de la réponse.
export interface TwelveDataErrorResponse {
  status: 'error';
  code: number;
  message: string;
}
