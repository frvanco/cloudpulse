import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

// Contexte propre à chaque requête HTTP, accessible depuis n'importe quel log
// sans le passer de fonction en fonction.
interface RequestContext {
  traceId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

// Cloud Run transmet l'identifiant de trace de la requête dans l'en-tête W3C
// `traceparent` (00-TRACEID-SPANID-FLAGS) ou, historiquement,
// `x-cloud-trace-context` (TRACEID/SPANID;o=1).
export function extractTraceId(
  headers: Request['headers'],
): string | undefined {
  const traceparent = headers['traceparent'];
  if (typeof traceparent === 'string') {
    const traceId = traceparent.split('-')[1];
    if (traceId && /^[0-9a-f]{32}$/.test(traceId)) return traceId;
  }
  const legacy = headers['x-cloud-trace-context'];
  if (typeof legacy === 'string') {
    const traceId = legacy.split('/')[0];
    if (/^[0-9a-f]{32}$/.test(traceId)) return traceId;
  }
  return undefined;
}

export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  requestContext.run({ traceId: extractTraceId(req.headers) }, next);
}
