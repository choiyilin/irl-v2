import { supabase } from '@/api/supabase/client';
import { wrap, type SupabaseError } from '@/api/supabase/wrap';
import { type StoragePath, type UserId } from '@/lib/brand';
import { type Result } from '@/lib/result';

export const fetchProfile = async (id: UserId) =>
  wrap(supabase.from('profiles').select('*').eq('id', id).single());

export const fetchPhotos = async (id: UserId) =>
  wrap(supabase.from('profile_photos').select('*').eq('user_id', id).order('slot_index'));

export const updateProfile = async (
  id: UserId,
  patch: Partial<{
    bio: string;
    occupation: string;
    education: string;
    city: string;
    hometown: string;
    height: number;
    show_occupation: boolean;
    show_education: boolean;
    show_city: boolean;
    show_hometown: boolean;
    show_height: boolean;
  }>,
) => wrap(supabase.from('profiles').update(patch).eq('id', id).select('*').single());

export type StorageError = Readonly<{ code: string; message: string }>;

export const createSignedUrls = async (
  paths: ReadonlyArray<StoragePath>,
  expiresInSeconds: number,
): Promise<Result<ReadonlyMap<StoragePath, { url: string; expiresInSeconds: number }>, StorageError>> => {
  const { data, error } = await supabase.storage
    .from('profile-photos')
    .createSignedUrls([...paths] as string[], expiresInSeconds);
  if (error !== null) {
    return { ok: false, error: { code: 'STORAGE_ERROR', message: error.message } };
  }
  const map = new Map<StoragePath, { url: string; expiresInSeconds: number }>();
  for (const item of data) {
    if (item.signedUrl !== null && item.path !== null) {
      map.set(item.path as unknown as StoragePath, { url: item.signedUrl, expiresInSeconds });
    }
  }
  return { ok: true, value: map };
};
