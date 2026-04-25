import { supabase } from '@/api/supabase/client';
import { wrap, type SupabaseError } from '@/api/supabase/wrap';
import { type ProfileId, type UserId } from '@/lib/brand';
import { err, ok, type Result } from '@/lib/result';

export type ExploreCursor = Readonly<{ profileId: ProfileId } | null>;
export type ExplorePage = Readonly<{
  rows: ReadonlyArray<{
    id: string;
    display_name: string;
    age: number | null;
    city: string | null;
    bio: string | null;
  }>;
  next: ExploreCursor;
}>;

const PAGE_SIZE = 20;

export const fetchExplorePage = async (
  viewerId: UserId,
  filters: Readonly<{ genders: ReadonlyArray<string> }>,
  cursor: ExploreCursor,
): Promise<Result<ExplorePage, SupabaseError>> => {
  let query = supabase
    .from('profiles')
    .select('id, display_name, age, city, bio')
    .neq('id', viewerId)
    .eq('onboarding_complete', true)
    .order('id', { ascending: true })
    .limit(PAGE_SIZE + 1);

  if (filters.genders.length > 0) {
    query = query.in('gender', [...filters.genders] as string[]);
  }
  if (cursor !== null) {
    query = query.gt('id', cursor.profileId);
  }

  const result = await wrap(query);
  if (!result.ok) {
    return err(result.error);
  }
  const rows = result.value;
  const hasMore = rows.length > PAGE_SIZE;
  const trimmed = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last = trimmed.at(-1);
  return ok({
    rows: trimmed,
    next: hasMore && last !== undefined ? { profileId: last.id as unknown as ProfileId } : null,
  });
};

export const recordLike = async (
  liker: UserId,
  liked: UserId,
): Promise<Result<{ matched: boolean }, SupabaseError>> => {
  const ins = await wrap(
    supabase.from('profile_likes').insert({ liker_id: liker, liked_id: liked }).select('liker_id').single(),
  );
  if (!ins.ok) {
    return err(ins.error);
  }
  const reciprocal = await wrap(
    supabase
      .from('profile_likes')
      .select('liker_id')
      .eq('liker_id', liked)
      .eq('liked_id', liker)
      .maybeSingle(),
  );
  if (!reciprocal.ok && reciprocal.error.code !== 'EMPTY') {
    return err(reciprocal.error);
  }
  return ok({ matched: reciprocal.ok });
};
