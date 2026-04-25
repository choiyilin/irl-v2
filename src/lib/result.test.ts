import { ok, err, isOk, isErr, map, mapErr, flatMap, unwrapOr } from './result';

describe('Result', () => {
  describe('ok / err / isOk / isErr', () => {
    it('constructs Ok with value and reports ok=true', () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      expect(isOk(r)).toBe(true);
      expect(isErr(r)).toBe(false);
      if (r.ok) {
        expect(r.value).toBe(42);
      }
    });

    it('constructs Err with error and reports ok=false', () => {
      const r = err('boom');
      expect(r.ok).toBe(false);
      expect(isOk(r)).toBe(false);
      expect(isErr(r)).toBe(true);
      if (!r.ok) {
        expect(r.error).toBe('boom');
      }
    });
  });

  describe('map', () => {
    it('applies fn over Ok value', () => {
      expect(map(ok(2), (n) => n * 3)).toEqual(ok(6));
    });
    it('passes Err through untouched', () => {
      expect(map(err('e'), (n: number) => n * 3)).toEqual(err('e'));
    });
  });

  describe('mapErr', () => {
    it('applies fn over Err error', () => {
      expect(mapErr(err('lo'), (s) => s.toUpperCase())).toEqual(err('LO'));
    });
    it('passes Ok through untouched', () => {
      expect(mapErr(ok(1), (s: string) => s.toUpperCase())).toEqual(ok(1));
    });
  });

  describe('flatMap', () => {
    it('chains Ok → Ok', () => {
      expect(flatMap(ok(2), (n) => ok(n + 1))).toEqual(ok(3));
    });
    it('chains Ok → Err', () => {
      expect(flatMap(ok(2), () => err('bad'))).toEqual(err('bad'));
    });
    it('short-circuits on Err input', () => {
      expect(flatMap(err('e'), (n: number) => ok(n + 1))).toEqual(err('e'));
    });
  });

  describe('unwrapOr', () => {
    it('returns Ok value', () => {
      expect(unwrapOr(ok(5), 0)).toBe(5);
    });
    it('returns fallback on Err', () => {
      expect(unwrapOr(err('e') as ReturnType<typeof err<string>>, 0)).toBe(0);
    });
  });
});
