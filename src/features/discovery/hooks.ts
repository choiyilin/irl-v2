import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type Bounds, queryKeys } from '@/api/query-keys';
import { type PromotionId } from '@/lib/brand';

import { claimTicket, fetchAvailability, fetchPromotions } from './api';

export const usePromotions = (bounds: Bounds) =>
  useQuery({
    queryKey: queryKeys.promotions.list(bounds),
    queryFn: async () => {
      const r = await fetchPromotions(bounds);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
  });

export const usePromotionAvailability = (id: PromotionId) =>
  useQuery({
    queryKey: queryKeys.promotions.availability(id),
    queryFn: async () => {
      const r = await fetchAvailability(id);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
    staleTime: 5 * 60_000,
  });

export const useClaimTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: PromotionId) => {
      const r = await claimTicket(id);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.promotions.availability(id) });
    },
  });
};
