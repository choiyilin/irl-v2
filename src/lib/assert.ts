export class AssertionError extends Error {
  public override readonly name = 'AssertionError';
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertNever(value: never, message?: string): never {
  throw new AssertionError(
    message ?? `Unexpected value reached supposedly unreachable code: ${JSON.stringify(value)}`,
  );
}

export const isString = (v: unknown): v is string => typeof v === 'string';
export const isNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
export const isNonEmptyString = (v: unknown): v is string => isString(v) && v.length > 0;
