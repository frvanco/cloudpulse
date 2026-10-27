import { describe, expect, it } from 'vitest';
import {
  analyze,
  decodeEvent,
  InvalidEventError,
  type PricesIngestedEvent,
} from './price-move.js';

const event: PricesIngestedEvent = {
  eventId: 'NVDA-2026-10-27',
  symbol: 'NVDA',
  date: '2026-10-27',
  close: '189.00',
  previousClose: '180.00',
  currency: 'USD',
  ingestedAt: '2026-10-28T06:00:00.000Z',
};

const message = (body: string) => ({
  message: { data: Buffer.from(body).toString('base64'), messageId: '1' },
});

describe('decodeEvent', () => {
  it('decodes the base64 JSON body of the Pub/Sub message', () => {
    expect(decodeEvent(message(JSON.stringify(event)))).toEqual(event);
  });

  it.each([
    ['an empty message', {}],
    ['a non JSON body', message('not json')],
    ['a missing field', message(JSON.stringify({ ...event, close: 189 }))],
  ])('rejects %s', (_, data) => {
    expect(() => decodeEvent(data)).toThrow(InvalidEventError);
  });
});

describe('analyze', () => {
  it('flags a move at or above the threshold, up or down', () => {
    expect(analyze(event, 5)).toEqual({ changePercent: 5, isMove: true });
    expect(analyze({ ...event, close: '171.00' }, 5)).toEqual({
      changePercent: -5,
      isMove: true,
    });
  });

  it('ignores a smaller move', () => {
    expect(analyze({ ...event, close: '181.80' }, 5)).toEqual({
      changePercent: 1,
      isMove: false,
    });
  });

  it('rejects a zero previous close', () => {
    expect(() => analyze({ ...event, previousClose: '0' }, 5)).toThrow(
      InvalidEventError,
    );
  });
});
