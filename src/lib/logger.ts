type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFn = (message: string, context?: Readonly<Record<string, unknown>>) => void;

export type Logger = Readonly<{
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  child: (scope: string) => Logger;
}>;

type Sink = (level: LogLevel, message: string, context?: Readonly<Record<string, unknown>>) => void;

const consoleSink: Sink = (level, message, context) => {
  const payload = context === undefined ? '' : ` ${JSON.stringify(context)}`;
  const line = `[${level}] ${message}${payload}`;
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  // debug + info routed to warn-channel-free console.warn would be wrong; keep them off the console
  // entirely in production by default. Tests can pass a custom sink.
};

export const createLogger = (scope: string, sink: Sink = consoleSink): Logger => {
  const prefixed = (level: LogLevel): LogFn => (message, context) =>
    sink(level, `${scope}: ${message}`, context);
  return {
    debug: prefixed('debug'),
    info: prefixed('info'),
    warn: prefixed('warn'),
    error: prefixed('error'),
    child: (childScope: string) => createLogger(`${scope}.${childScope}`, sink),
  };
};
