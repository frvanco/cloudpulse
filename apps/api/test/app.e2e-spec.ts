import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

const nvdaQuote = {
  symbol: 'NVDA',
  name: 'NVIDIA Corp',
  exchange: 'NASDAQ',
  currency: 'USD',
  datetime: '2026-09-29',
  timestamp: 1790640000,
  open: '180.10',
  high: '184.00',
  low: '179.50',
  close: '183.25',
  volume: '150000000',
  previous_close: '180.00',
  change: '3.25',
  percent_change: '1.80556',
  is_market_open: false,
};

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /companies/:symbol/quote maps the provider response', async () => {
    fetchMock.mockResolvedValue(Response.json(nvdaQuote));

    const res = await request(app.getHttpServer())
      .get('/companies/nvda/quote')
      .expect(200);

    expect(res.body).toEqual({
      symbol: 'NVDA',
      name: 'NVIDIA Corp',
      exchange: 'NASDAQ',
      currency: 'USD',
      price: 183.25,
      previousClose: 180,
      change: 3.25,
      changePercent: 1.80556,
      isMarketOpen: false,
      marketTimestamp: '2026-09-29T00:00:00.000Z',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.twelvedata.com/quote?symbol=NVDA');
    expect(String(url)).not.toContain('apikey');
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'apikey test-key',
    );
  });

  it('returns 404 when the provider reports an unknown symbol with HTTP 200', () => {
    fetchMock.mockResolvedValue(
      Response.json({
        status: 'error',
        code: 404,
        message: 'symbol not found',
      }),
    );
    return request(app.getHttpServer())
      .get('/companies/XXXXX/quote')
      .expect(404);
  });

  it('returns 429 when the provider rate limit is reached', () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: 'error', code: 429, message: 'credits used' }),
    );
    return request(app.getHttpServer())
      .get('/companies/NVDA/quote')
      .expect(429);
  });

  it('returns 502 and hides the provider message on an invalid API key', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        status: 'error',
        code: 401,
        message: 'bad key test-key',
      }),
    );
    const res = await request(app.getHttpServer())
      .get('/companies/NVDA/quote')
      .expect(502);
    expect(JSON.stringify(res.body)).not.toContain('test-key');
  });

  it('returns 502 when the provider is unreachable', () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    return request(app.getHttpServer())
      .get('/companies/NVDA/quote')
      .expect(502);
  });

  it('rejects an invalid symbol without calling the provider', async () => {
    await request(app.getHttpServer())
      .get('/companies/NV%20DA%3Bx/quote')
      .expect(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
