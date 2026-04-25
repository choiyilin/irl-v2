import { createLogger } from './logger';

type Capture = ReadonlyArray<{ level: string; message: string; context?: Readonly<Record<string, unknown>> }>;

const recordingSink = () => {
  const captures: Array<{ level: string; message: string; context?: Readonly<Record<string, unknown>> }> = [];
  const sink = (level: string, message: string, context?: Readonly<Record<string, unknown>>) => {
    captures.push({ level, message, ...(context !== undefined && { context }) });
  };
  return { sink, captures: captures as Capture };
};

describe('logger', () => {
  it('prefixes messages with scope', () => {
    const { sink, captures } = recordingSink();
    const log = createLogger('auth', sink);
    log.info('hello');
    expect(captures).toEqual([{ level: 'info', message: 'auth: hello' }]);
  });

  it('emits at every level', () => {
    const { sink, captures } = recordingSink();
    const log = createLogger('x', sink);
    log.debug('a');
    log.info('b');
    log.warn('c');
    log.error('d', { code: 1 });
    expect(captures.map((c) => c.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(captures[3]?.context).toEqual({ code: 1 });
  });

  it('child appends scope segment', () => {
    const { sink, captures } = recordingSink();
    const log = createLogger('app', sink).child('feature');
    log.info('msg');
    expect(captures[0]?.message).toBe('app.feature: msg');
  });

  describe('default console sink', () => {
    it('routes error to console.error and warn to console.warn; debug/info are silenced', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const log = createLogger('s');
      log.debug('d');
      log.info('i');
      log.warn('w');
      log.error('e', { code: 'x' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toBe('[warn] s: w');
      expect(errSpy).toHaveBeenCalledTimes(1);
      expect(errSpy.mock.calls[0]?.[0]).toBe('[error] s: e {"code":"x"}');
      errSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});
