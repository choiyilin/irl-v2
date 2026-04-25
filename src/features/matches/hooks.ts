import { useMutation, useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { type MatchId, type UserId } from '@/lib/brand';

import { fetchMatches, getOrCreateChatRoom } from './api';

export const useMatches = (viewer: UserId) =>
  useQuery({
    queryKey: queryKeys.matches.list(viewer),
    queryFn: async () => {
      const r = await fetchMatches(viewer);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
  });

export const useOpenChatRoom = () =>
  useMutation({
    mutationFn: async (matchId: MatchId) => {
      const r = await getOrCreateChatRoom(matchId);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
  });
