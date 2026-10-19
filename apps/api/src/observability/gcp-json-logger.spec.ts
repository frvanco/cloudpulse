import { GcpJsonLogger } from './gcp-json-logger.js';
import { extractTraceId, requestContext } from './request-context.js';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';

function createLogger() {
  const lines: Record<string, unknown>[] = [];
  const logger = new GcpJsonLogger({
    projectId: 'cloudpulse-001',
    service: 'cloudpulse-api',
    version: 'cloudpulse-api-00042-abc',
    write: (line) => lines.push(JSON.parse(line) as Record<string, unknown>),
  });
  return { logger, lines };
}

describe('GcpJsonLogger', () => {
  it('writes one JSON entry with severity, message and context', () => {
    const { logger, lines } = createLogger();
    logger.warn('Something odd', 'CompaniesService');
    expect(lines).toEqual([
      {
        severity: 'WARNING',
        message: 'Something odd',
        context: 'CompaniesService',
      },
    ]);
  });

  it('keeps the fields of a structured event queryable', () => {
    const { logger, lines } = createLogger();
    logger.log(
      {
        event: 'ingestion.symbol',
        symbol: 'NVDA',
        status: 'ingested',
        days: 5,
      },
      'IngestionService',
    );
    expect(lines[0]).toMatchObject({
      severity: 'INFO',
      message: 'ingestion.symbol',
      event: 'ingestion.symbol',
      symbol: 'NVDA',
      days: 5,
      context: 'IngestionService',
    });
  });

  it('formats errors with a stack for Error Reporting', () => {
    const { logger, lines } = createLogger();
    const error = new Error('boom');
    logger.error(error.message, error.stack, 'ExceptionsHandler');
    expect(lines[0]).toMatchObject({
      severity: 'ERROR',
      context: 'ExceptionsHandler',
      '@type':
        'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
      serviceContext: {
        service: 'cloudpulse-api',
        version: 'cloudpulse-api-00042-abc',
      },
    });
    expect(lines[0].message).toContain('boom');
    expect(lines[0].message).toMatch(/\n\s+at /);
  });

  it('does not report errors without a stack to Error Reporting', () => {
    const { logger, lines } = createLogger();
    logger.error({ event: 'provider.request', outcome: 'unreachable' }, 'X');
    expect(lines[0].severity).toBe('ERROR');
    expect(lines[0]['@type']).toBeUndefined();
  });

  it('links the entry to the trace of the current request', () => {
    const { logger, lines } = createLogger();
    requestContext.run({ traceId: TRACE_ID }, () => logger.log('in request'));
    logger.log('outside request');
    expect(lines[0]['logging.googleapis.com/trace']).toBe(
      `projects/cloudpulse-001/traces/${TRACE_ID}`,
    );
    expect(lines[1]['logging.googleapis.com/trace']).toBeUndefined();
  });

  it('serializes bigint values', () => {
    const { logger, lines } = createLogger();
    logger.log({ event: 'x', volume: 150000000n });
    expect(lines[0].volume).toBe('150000000');
  });
});

describe('extractTraceId', () => {
  it('reads the W3C traceparent header', () => {
    expect(
      extractTraceId({ traceparent: `00-${TRACE_ID}-00f067aa0ba902b7-01` }),
    ).toBe(TRACE_ID);
  });

  it('reads the legacy X-Cloud-Trace-Context header', () => {
    expect(
      extractTraceId({ 'x-cloud-trace-context': `${TRACE_ID}/123;o=1` }),
    ).toBe(TRACE_ID);
  });

  it('ignores malformed headers', () => {
    expect(extractTraceId({ traceparent: 'garbage' })).toBeUndefined();
    expect(extractTraceId({})).toBeUndefined();
  });
});
