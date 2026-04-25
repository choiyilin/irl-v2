import { type PostgrestError, type PostgrestSingleResponse } from '@supabase/supabase-js';

import { err, ok, type Result } from '@/lib/result';

export type SupabaseError = Readonly<{
  code: string;
  message: string;
  details: string | null;
}>;

const toSupabaseError = (e: PostgrestError): SupabaseError => ({
  code: e.code,
  message: e.message,
  details: e.details,
});

export const wrap = async <T>(
  builder: PromiseLike<PostgrestSingleResponse<T>>,
): Promise<Result<T, SupabaseError>> => {
  const { data, error } = await builder;
  if (error !== null) {
    return err(toSupabaseError(error));
  }
  if (data === null) {
    return err({ code: 'EMPTY', message: 'Query returned no data', details: null });
  }
  return ok(data);
};
