import { supabase } from '@/api/supabase/client';
import { wrap } from '@/api/supabase/wrap';
import { type UserId } from '@/lib/brand';

export const fetchMissedConnections = async (limit: number, after: string | null) =>
  wrap(supabase.rpc('get_missed_connections', { p_limit: limit, p_after: after }));

export const hasMissedConnection = async (otherUserId: UserId) =>
  wrap(supabase.rpc('has_missed_connection', { p_other_user_id: otherUserId }));
