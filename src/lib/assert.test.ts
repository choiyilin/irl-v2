import { assert, AssertionError, assertNever, isNonEmptyString, isNumber, isString } from './assert';

describe('assert', () => {
  it('passes through truthy conditions', () => {
    expect(() => {
      assert(true, 'should not throw');
    }).not.toThrow();
  });

  it('throws AssertionError on falsy conditions', () => {
    expect(() => {
      assert(0, 'zero is falsy');
    }).toThrow(AssertionError);
    expect(() => {
      assert('', 'empty string is falsy');
    }).toThrow('empty string is falsy');
  });

  it('AssertionError carries the right name', () => {
    try {
      assert(false, 'm');
    } catch (e) {
      expect(e).toBeInstanceOf(AssertionError);
      expect((e as AssertionError).name).toBe('AssertionError');
    }
  });
});

describe('assertNever', () => {
  it('throws with a default message when no message provided', () => {
    expect(() => {
      // simulate unreachable
      assertNever('x' as never);
    }).toThrow(/Unexpected value/);
  });

  it('throws with the provided message', () => {
    expect(() => {
      assertNever('x' as never, 'custom');
    }).toThrow('custom');
  });
});

describe('type guards', () => {
  it('isString', () => {
    expect(isString('a')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(undefined)).toBe(false);
  });

  it('isNumber rejects NaN', () => {
    expect(isNumber(1)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false);
    expect(isNumber('1')).toBe(false);
  });

  it('isNonEmptyString', () => {
    expect(isNonEmptyString('a')).toBe(true);
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
  });
});
