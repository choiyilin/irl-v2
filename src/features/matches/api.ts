import { supabase } from '@/api/supabase/client';
import { wrap } from '@/api/supabase/wrap';
import { type MatchId, type UserId } from '@/lib/brand';

export const fetchMatches = async (viewer: UserId) =>
  wrap(
    supabase
      .from('matches')
      .select('id, user_low_id, user_high_id, created_at')
      .or(`user_low_id.eq.${viewer},user_high_id.eq.${viewer}`)
      .order('created_at', { ascending: false }),
  );

export const getOrCreateChatRoom = async (matchId: MatchId) =>
  wrap(supabase.rpc('get_or_create_match_chat', { p_match_id: matchId }));
