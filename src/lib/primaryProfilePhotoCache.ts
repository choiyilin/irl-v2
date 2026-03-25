import { Image } from "react-native";

import { supabase } from "@/src/lib/supabase";

export type CachedProfilePhotoSlot = {
  id: string;
  slot_index: number;
  storage_path: string;
  displayUrl: string;
};

const TTL_MS = 50 * 60 * 1000;
const SIGN_URL_SEC = 60 * 60;

const cache = new Map<string, { entry: CachedProfilePhotoSlot; at: number }>();
const inflightWarm = new Map<string, Promise<void>>();

export function invalidatePrimaryProfilePhotoCache(userId?: string) {
  if (typeof userId === "string" && userId.length > 0) {
    cache.delete(userId);
    return;
  }
  cache.clear();
}

function cacheGet(userId: string): CachedProfilePhotoSlot | null {
  const row = cache.get(userId);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return row.entry;
}

async function fetchAndCachePrimarySlot(userId: string): Promise<CachedProfilePhotoSlot | null> {
  const { data, error } = await supabase
    .from("profile_photos")
    .select("id, slot_index, storage_path")
    .eq("user_id", userId)
    .eq("slot_index", 1)
    .maybeSingle();

  if (error || !data?.storage_path) {
    cache.delete(userId);
    return null;
  }

  const row = data as { id: string; slot_index: number; storage_path: string };

  const { data: signed, error: signError } = await supabase.storage
    .from("profile-photos")
    .createSignedUrl(row.storage_path, SIGN_URL_SEC);

  if (signError || !signed?.signedUrl) {
    return null;
  }

  const entry: CachedProfilePhotoSlot = {
    id: row.id,
    slot_index: row.slot_index,
    storage_path: row.storage_path,
    displayUrl: signed.signedUrl,
  };

  cache.set(userId, { entry, at: Date.now() });
  return entry;
}

/**
 * Fetches slot-1 photo + signed URL, stores in memory, and prefetches image bytes.
 * Deduped per userId while a warm is in flight. Safe to await from Profile after auth starts a fire-and-forget warm.
 */
export function warmPrimaryProfilePhoto(userId: string): Promise<void> {
  const existingPromise = inflightWarm.get(userId);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    try {
      const cached = cacheGet(userId);
      if (cached) {
        await Image.prefetch(cached.displayUrl).catch(() => undefined);
        return;
      }

      const entry = await fetchAndCachePrimarySlot(userId);
      if (entry) {
        await Image.prefetch(entry.displayUrl).catch(() => undefined);
      }
    } finally {
      inflightWarm.delete(userId);
    }
  })();

  inflightWarm.set(userId, promise);
  return promise;
}

export function getCachedPrimaryProfilePhoto(userId: string): CachedProfilePhotoSlot | null {
  return cacheGet(userId);
}
