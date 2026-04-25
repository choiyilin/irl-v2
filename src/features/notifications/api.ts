import { supabase } from '@/api/supabase/client';
import { wrap } from '@/api/supabase/wrap';
import { type UserId } from '@/lib/brand';

export const upsertPushToken = async (userId: UserId, token: string) =>
  wrap(
    supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token, platform: 'ios', last_seen: new Date().toISOString() })
      .select('token')
      .single(),
  );

export const deletePushToken = async (token: string) =>
  wrap(supabase.from('push_tokens').delete().eq('token', token).select('token').single());
