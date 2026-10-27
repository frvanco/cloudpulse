import { buildPricesIngestedEvent } from './prices-ingested.event.js';

const value = (datetime: string, close: string) => ({
  datetime,
  open: '1',
  high: '1',
  low: '1',
  close,
});

describe('buildPricesIngestedEvent', () => {
  const now = new Date('2026-10-28T06:00:00Z');

  it('describes the latest day with the previous close, whatever the order', () => {
    const event = buildPricesIngestedEvent(
      'NVDA',
      'USD',
      [
        value('2026-10-26', '180.00'),
        value('2026-10-27', '183.25'),
        value('2026-10-23', '175.00'),
      ],
      now,
    );
    expect(event).toEqual({
      eventId: 'NVDA-2026-10-27',
      symbol: 'NVDA',
      date: '2026-10-27',
      close: '183.25',
      previousClose: '180.00',
      currency: 'USD',
      ingestedAt: '2026-10-28T06:00:00.000Z',
    });
  });

  it('returns null without a previous day', () => {
    expect(
      buildPricesIngestedEvent('NVDA', 'USD', [value('2026-10-27', '1')], now),
    ).toBeNull();
  });
});
