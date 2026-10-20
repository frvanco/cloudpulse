import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
import type {
  TwelveDataErrorResponse,
  TwelveDataQuoteResponse,
  TwelveDataTimeSeriesResponse,
} from './twelve-data.types.js';

@Injectable()
export class TwelveDataService {
  private readonly logger = new Logger(TwelveDataService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  getQuote(symbol: string): Promise<TwelveDataQuoteResponse> {
    return this.request<TwelveDataQuoteResponse>('/quote', { symbol });
  }

  // Derniers cours journaliers, du plus récent au plus ancien (1 crédit).
  getDailySeries(
    symbol: string,
    days: number,
  ): Promise<TwelveDataTimeSeriesResponse> {
    return this.request<TwelveDataTimeSeriesResponse>('/time_series', {
      symbol,
      interval: '1day',
      outputsize: String(days),
    });
  }

  private async request<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, this.config.get('TWELVE_DATA_BASE_URL'));
    url.search = new URLSearchParams(params).toString();

    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        // Clé dans un en-tête, jamais dans l'URL (les URL finissent dans les logs).
        headers: {
          Authorization: `apikey ${this.config.get('TWELVE_DATA_API_KEY')}`,
        },
        signal: AbortSignal.timeout(this.config.get('TWELVE_DATA_TIMEOUT_MS')),
      });
    } catch (error) {
      this.logger.error({
        event: 'provider.request',
        path,
        outcome: 'unreachable',
        durationMs: Date.now() - startedAt,
        error: String(error),
      });
      throw new BadGatewayException('Market data provider unreachable');
    }

    const body = (await response.json().catch(() => null)) as
      T | TwelveDataErrorResponse | null;

    if (body === null) {
      throw new BadGatewayException(
        'Invalid response from market data provider',
      );
    }
    if (isErrorResponse(body)) {
      this.logger.warn({
        event: 'provider.request',
        path,
        outcome: 'error',
        code: body.code,
        durationMs: Date.now() - startedAt,
        // Par précaution, la clé n'apparaît jamais dans les logs.
        providerMessage: body.message.replaceAll(
          this.config.get('TWELVE_DATA_API_KEY'),
          '[REDACTED]',
        ),
      });
      throw this.toHttpException(body);
    }
    if (!response.ok) {
      throw new BadGatewayException(
        `Market data provider returned HTTP ${response.status}`,
      );
    }
    this.logger.log({
      event: 'provider.request',
      path,
      outcome: 'ok',
      durationMs: Date.now() - startedAt,
    });
    return body;
  }

  private toHttpException(error: TwelveDataErrorResponse): HttpException {
    switch (error.code) {
      case 400:
      case 404:
        return new NotFoundException(error.message);
      case 429:
        return new HttpException(
          'Market data provider rate limit reached, retry later',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      default:
        // 401/403 (clé invalide ou plan insuffisant) et 5xx : problème côté
        // serveur, pas côté client. On ne renvoie pas le message brut.
        return new BadGatewayException('Market data provider error');
    }
  }
}

function isErrorResponse(body: unknown): body is TwelveDataErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { status?: unknown }).status === 'error'
  );
}
