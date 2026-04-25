import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { type UserId } from '@/lib/brand';

import { fetchMissedConnections, hasMissedConnection } from './api';

const PAGE_SIZE = 20;

export const useMissedConnectionsFeed = () =>
  useInfiniteQuery<
    ReadonlyArray<{ claimed_at: string; other_user_id: string; display_name: string }>,
    Error,
    { pages: ReadonlyArray<ReadonlyArray<{ claimed_at: string; other_user_id: string; display_name: string }>> },
    readonly unknown[],
    string | null
  >({
    queryKey: ['missed', 'feed'] as const,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const r = await fetchMissedConnections(PAGE_SIZE, pageParam);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
    getNextPageParam: (last) => {
      if (last.length === 0) {
        return null;
      }
      return last[last.length - 1]?.claimed_at ?? null;
    },
  });

export const useHasMissedConnection = (otherUserId: UserId) =>
  useQuery({
    queryKey: ['missed', 'has', otherUserId] as const,
    queryFn: async () => {
      const r = await hasMissedConnection(otherUserId);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
  });
