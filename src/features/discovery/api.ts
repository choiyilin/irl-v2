import { supabase } from '@/api/supabase/client';
import { wrap } from '@/api/supabase/wrap';
import { type Bounds } from '@/api/query-keys';
import { type PromotionId } from '@/lib/brand';

export const fetchPromotions = async (b: Bounds) =>
  wrap(
    supabase
      .from('business_promotions')
      .select('id, business_name, category, description, address, latitude, longitude, max_claims, is_active')
      .eq('is_active', true)
      .gte('latitude', b.south)
      .lte('latitude', b.north)
      .gte('longitude', b.west)
      .lte('longitude', b.east),
  );

export const fetchAvailability = async (id: PromotionId) =>
  wrap(supabase.rpc('get_promotion_availability', { p_promotion_id: id }));

export const claimTicket = async (id: PromotionId) =>
  wrap(supabase.rpc('claim_promotion_ticket', { p_promotion_id: id }));
