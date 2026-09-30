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
}
