import type { LoggerService } from '@nestjs/common';
import { isSpanContextValid, trace, TraceFlags } from '@opentelemetry/api';
import { requestContext } from './request-context.js';

type Severity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface GcpLoggerOptions {
  // Pour relier les logs à la trace de la requête dans Cloud Logging / Trace.
  projectId?: string;
  // Identifie le service et sa version dans Error Reporting (K_SERVICE et
  // K_REVISION sont fournis par Cloud Run).
  service?: string;
  version?: string;
  write?: (line: string) => void;
}

const STACK_PATTERN = /\n\s+at /;

// Logger Nest qui écrit une ligne JSON par log sur stdout. Cloud Run transmet
// stdout à Cloud Logging, qui interprète les champs spéciaux :
// - severity : niveau du log (filtrable, colorié dans la console) ;
// - message : texte affiché ;
// - logging.googleapis.com/trace (+ spanId, trace_sampled) : regroupe les logs
//   d'une même requête et les relie à sa trace dans Cloud Trace ;
// - @type ReportedErrorEvent + stack : crée une erreur dans Error Reporting.
// Les autres champs arrivent dans jsonPayload et sont interrogeables.
export class GcpJsonLogger implements LoggerService {
  private readonly write: (line: string) => void;

  constructor(private readonly options: GcpLoggerOptions = {}) {
    this.write =
      options.write ?? ((line) => void process.stdout.write(`${line}\n`));
  }

  log(message: unknown, ...params: unknown[]): void {
    this.emit('INFO', message, params);
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.emit('WARNING', message, params);
  }

  error(message: unknown, ...params: unknown[]): void {
    this.emit('ERROR', message, params);
  }

  fatal(message: unknown, ...params: unknown[]): void {
    this.emit('CRITICAL', message, params);
  }

  debug(message: unknown, ...params: unknown[]): void {
    this.emit('DEBUG', message, params);
  }

  verbose(message: unknown, ...params: unknown[]): void {
    this.emit('DEBUG', message, params);
  }

  private emit(severity: Severity, message: unknown, params: unknown[]): void {
    // Convention Nest : le dernier paramètre texte est le contexte (nom de la
    // classe), un paramètre qui ressemble à une pile d'appels est la stack.
    const strings = params.filter((p): p is string => typeof p === 'string');
    const stack = strings.find((p) => STACK_PATTERN.test(p));
    const context = strings.filter((p) => p !== stack).at(-1);

    const entry: Record<string, unknown> = { severity };
    if (message instanceof Error) {
      entry.message = message.stack ?? message.message;
    } else if (typeof message === 'object' && message !== null) {
      // Événement structuré : ses champs deviennent interrogeables.
      Object.assign(entry, message);
      entry.message ??= (message as { event?: string }).event ?? '';
    } else {
      entry.message = String(message);
    }
    if (context) entry.context = context;

    if (stack) {
      // Error Reporting lit la pile dans le message.
      entry.message = `${String(entry.message)}\n${stack}`;
    }
    if (stack || message instanceof Error) {
      entry['@type'] =
        'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent';
      if (this.options.service) {
        entry.serviceContext = {
          service: this.options.service,
          version: this.options.version,
        };
      }
    }

    // Avec OpenTelemetry, le span actif donne la trace et le span : le log
    // s'ouvre depuis la trace dans Cloud Trace, et inversement. Sinon, la
    // trace vient de l'en-tête de la requête.
    const span = trace.getActiveSpan()?.spanContext();
    const activeSpan = span && isSpanContextValid(span) ? span : undefined;
    const traceId = activeSpan?.traceId ?? requestContext.getStore()?.traceId;
    if (traceId && this.options.projectId) {
      entry['logging.googleapis.com/trace'] =
        `projects/${this.options.projectId}/traces/${traceId}`;
      if (activeSpan) {
        entry['logging.googleapis.com/spanId'] = activeSpan.spanId;
        entry['logging.googleapis.com/trace_sampled'] =
          (activeSpan.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
      }
    }

    this.write(JSON.stringify(entry, jsonReplacer));
  }
}

// BigInt (volumes) n'est pas sérialisable nativement en JSON.
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}
