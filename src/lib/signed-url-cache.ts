import { type SignedUrl, type StoragePath, signedUrl as toSignedUrl } from './brand';

const REFRESH_LEAD_MS = 60_000;

type CacheEntry = Readonly<{ url: SignedUrl; expiresAt: number }>;

export type SignedUrlResolver = (
  paths: ReadonlyArray<StoragePath>,
) => Promise<ReadonlyMap<StoragePath, { url: string; expiresInSeconds: number }>>;

export type Clock = Readonly<{ now: () => number }>;

export type SignedUrlCacheOptions = Readonly<{
  capacity: number;
  resolve: SignedUrlResolver;
  clock?: Clock;
}>;

export type SignedUrlCache = Readonly<{
  get: (path: StoragePath) => Promise<SignedUrl>;
  size: () => number;
  clear: () => void;
}>;

const realClock: Clock = { now: () => Date.now() };

const promoteToHead = (
  entries: Map<StoragePath, CacheEntry>,
  path: StoragePath,
  entry: CacheEntry,
): void => {
  entries.delete(path);
  entries.set(path, entry);
};

export const createSignedUrlCache = (options: SignedUrlCacheOptions): SignedUrlCache => {
  const { capacity, resolve } = options;
  const clock = options.clock ?? realClock;
  const entries = new Map<StoragePath, CacheEntry>();
  const inflight = new Map<StoragePath, Promise<SignedUrl>>();

  const isFresh = (entry: CacheEntry): boolean => clock.now() + REFRESH_LEAD_MS < entry.expiresAt;

  const evictIfFull = (): void => {
    while (entries.size > capacity) {
      const oldest = entries.keys().next();
      if (oldest.done === true) {
        return;
      }
      entries.delete(oldest.value);
    }
  };

  const fetchAndStore = async (path: StoragePath): Promise<SignedUrl> => {
    const map = await resolve([path]);
    const next = map.get(path);
    if (next === undefined) {
      throw new Error(`Resolver did not return signed URL for path: ${path}`);
    }
    const url = toSignedUrl(next.url);
    const entry: CacheEntry = {
      url,
      expiresAt: clock.now() + next.expiresInSeconds * 1000,
    };
    entries.set(path, entry);
    evictIfFull();
    return url;
  };

  const get = (path: StoragePath): Promise<SignedUrl> => {
    const cached = entries.get(path);
    if (cached !== undefined && isFresh(cached)) {
      promoteToHead(entries, path, cached);
      return Promise.resolve(cached.url);
    }
    const pending = inflight.get(path);
    if (pending !== undefined) {
      return pending;
    }
    const promise = fetchAndStore(path).finally(() => {
      inflight.delete(path);
    });
    inflight.set(path, promise);
    return promise;
  };

  return {
    get,
    size: () => entries.size,
    clear: () => {
      entries.clear();
      inflight.clear();
    },
  };
};
