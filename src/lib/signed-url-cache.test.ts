import { storagePath, type StoragePath } from './brand';
import { createSignedUrlCache, type Clock, type SignedUrlResolver } from './signed-url-cache';

const path = (s: string): StoragePath => storagePath(s);

const fakeClock = (start: number) => {
  const state = { t: start };
  const clock: Clock = { now: () => state.t };
  const advance = (ms: number) => {
    state.t += ms;
  };
  return { clock, advance };
};

describe('signed-url-cache', () => {
  it('fetches on miss and caches result', async () => {
    const { clock } = fakeClock(0);
    const resolve = jest.fn<ReturnType<SignedUrlResolver>, Parameters<SignedUrlResolver>>(async (paths) =>
      new Map(paths.map((p) => [p, { url: `https://x/${p}`, expiresInSeconds: 3600 }])),
    );
    const cache = createSignedUrlCache({ capacity: 5, resolve, clock });

    const a = path('a.jpg');
    expect(await cache.get(a)).toBe('https://x/a.jpg');
    expect(await cache.get(a)).toBe('https://x/a.jpg');
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('refetches when entry expires', async () => {
    const { clock, advance } = fakeClock(0);
    let n = 0;
    const resolve: SignedUrlResolver = async (paths) =>
      new Map(paths.map((p) => [p, { url: `https://x/${p}?v=${(n += 1)}`, expiresInSeconds: 60 }]));
    const cache = createSignedUrlCache({ capacity: 5, resolve: jest.fn(resolve), clock });

    const a = path('a.jpg');
    expect(await cache.get(a)).toBe('https://x/a.jpg?v=1');
    advance(120_000);
    expect(await cache.get(a)).toBe('https://x/a.jpg?v=2');
  });

  it('coalesces concurrent requests for the same path', async () => {
    const { clock } = fakeClock(0);
    let calls = 0;
    const resolve: SignedUrlResolver = async (paths) => {
      calls += 1;
      await Promise.resolve();
      return new Map(paths.map((p) => [p, { url: `https://x/${p}`, expiresInSeconds: 3600 }]));
    };
    const cache = createSignedUrlCache({ capacity: 5, resolve: jest.fn(resolve), clock });

    const a = path('a.jpg');
    const [u1, u2, u3] = await Promise.all([cache.get(a), cache.get(a), cache.get(a)]);
    expect(u1).toBe(u2);
    expect(u2).toBe(u3);
    expect(calls).toBe(1);
  });

  it('evicts least-recently-used entries when capacity exceeded', async () => {
    const { clock } = fakeClock(0);
    const resolve = jest.fn<ReturnType<SignedUrlResolver>, Parameters<SignedUrlResolver>>(async (paths) =>
      new Map(paths.map((p) => [p, { url: `https://x/${p}`, expiresInSeconds: 3600 }])),
    );
    const cache = createSignedUrlCache({ capacity: 2, resolve, clock });

    await cache.get(path('a'));
    await cache.get(path('b'));
    await cache.get(path('a')); // promote a
    await cache.get(path('c')); // should evict b
    expect(cache.size()).toBe(2);

    // Re-fetching b proves it was evicted
    await cache.get(path('b'));
    expect(resolve).toHaveBeenCalledTimes(4);
  });

  it('clear empties the cache', async () => {
    const { clock } = fakeClock(0);
    const resolve: SignedUrlResolver = async (paths) =>
      new Map(paths.map((p) => [p, { url: `https://x/${p}`, expiresInSeconds: 3600 }]));
    const cache = createSignedUrlCache({ capacity: 5, resolve: jest.fn(resolve), clock });

    await cache.get(path('a'));
    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('uses real-time clock when none provided (smoke test)', async () => {
    const resolve: SignedUrlResolver = async (paths) =>
      new Map(paths.map((p) => [p, { url: `https://x/${p}`, expiresInSeconds: 3600 }]));
    const cache = createSignedUrlCache({ capacity: 1, resolve: jest.fn(resolve) });
    expect(await cache.get(path('a'))).toBe('https://x/a');
  });

  it('throws if resolver omits the requested path', async () => {
    const { clock } = fakeClock(0);
    const resolve: SignedUrlResolver = async () => new Map();
    const cache = createSignedUrlCache({ capacity: 1, resolve: jest.fn(resolve), clock });
    await expect(cache.get(path('a'))).rejects.toThrow('did not return signed URL');
  });
});
