/**
 * Minimal structured logger.
 *
 * Production builds suppress `debug`/`info` noise but always surface warnings and
 * errors. Swap the `sink` to forward to an observability backend (Sentry, etc.)
 * without touching call sites.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

interface LogRecord {
  level: LogLevel;
  scope: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

type Sink = (record: LogRecord) => void;

const consoleSink: Sink = (record) => {
  const fn =
    record.level === 'error'
      ? console.error
      : record.level === 'warn'
        ? console.warn
        : console.log;
  fn(`[${record.scope}] ${record.message}`, record.context ?? '');
};

let sink: Sink = consoleSink;
let minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'warn';

export function configureLogger(options: { sink?: Sink; minLevel?: LogLevel }): void {
  if (options.sink) sink = options.sink;
  if (options.minLevel) minLevel = options.minLevel;
}

function emit(level: LogLevel, scope: string, message: string, context?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  sink({ level, scope, message, context, timestamp: new Date().toISOString() });
}

export interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

/** Create a scoped logger, e.g. `createLogger('scanner')`. */
export function createLogger(scope: string): Logger {
  return {
    debug: (m, c) => emit('debug', scope, m, c),
    info: (m, c) => emit('info', scope, m, c),
    warn: (m, c) => emit('warn', scope, m, c),
    error: (m, c) => emit('error', scope, m, c),
  };
}
