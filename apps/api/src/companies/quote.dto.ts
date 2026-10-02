// Format exposé par notre API : indépendant du fournisseur de données.
export interface QuoteDto {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  isMarketOpen: boolean;
  marketTimestamp: string;
  // Date à laquelle CloudPulse a récupéré la donnée auprès du fournisseur.
  fetchedAt: string;
  // true si le fournisseur est indisponible et que la donnée est périmée.
  stale: boolean;
}
