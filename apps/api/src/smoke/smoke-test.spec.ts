import { runSmokeTest } from './smoke-test.js';

const ready = (revision: string) =>
  Response.json({ status: 'ok', database: 'ok', revision });

describe('runSmokeTest', () => {
  const headers = new Headers({ Authorization: 'Bearer token' });

  it('counts the responses of each revision', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(ready('rev-1'))
      .mockResolvedValueOnce(ready('rev-2'))
      .mockResolvedValueOnce(ready('rev-1'));

    const result = await runSmokeTest({
      url: 'https://api.example.test',
      requests: 3,
      headers,
      fetchFn,
    });

    expect(result).toEqual({
      url: 'https://api.example.test',
      requests: 3,
      ok: 3,
      failed: 0,
      revisions: { 'rev-1': 2, 'rev-2': 1 },
    });
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toBe('https://api.example.test/health/ready');
    expect(init?.headers).toBe(headers);
  });

  it('retries a transient failure before counting a success', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(ready('rev-2'));

    const result = await runSmokeTest({
      url: 'https://api.example.test',
      requests: 1,
      headers,
      fetchFn,
      retryDelayMs: 0,
    });
    expect(result).toMatchObject({ ok: 1, failed: 0 });
  });

  it('reports a request that keeps failing', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(new Response(null, { status: 503 })),
      );

    const result = await runSmokeTest({
      url: 'https://api.example.test',
      requests: 2,
      headers,
      fetchFn,
      retryDelayMs: 0,
    });
    expect(result).toMatchObject({ ok: 0, failed: 2 });
    expect(fetchFn).toHaveBeenCalledTimes(6);
  });
});
