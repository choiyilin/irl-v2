import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/query-keys';
import { type UserId } from '@/lib/brand';

import { fetchExplorePage, recordLike, type ExploreCursor, type ExplorePage } from './api';

export const useExploreFeed = (viewerId: UserId, genders: ReadonlyArray<string>) =>
  useInfiniteQuery<ExplorePage, Error, { pages: ReadonlyArray<ExplorePage> }, readonly unknown[], ExploreCursor>({
    queryKey: queryKeys.explore.feed(viewerId, { genders }),
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const r = await fetchExplorePage(viewerId, { genders }, pageParam);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
    getNextPageParam: (last) => last.next,
  });

export const useLike = (viewerId: UserId, genders: ReadonlyArray<string>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ likedId }: { likedId: UserId }) => {
      const r = await recordLike(viewerId, likedId);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
    onMutate: async ({ likedId }) => {
      const key = queryKeys.explore.feed(viewerId, { genders });
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<{ pages: ReadonlyArray<ExplorePage> }>(key);
      qc.setQueryData<{ pages: ReadonlyArray<ExplorePage> }>(key, (old) => {
        if (old === undefined) {
          return old;
        }
        const pages = old.pages.map((page) => ({
          ...page,
          rows: page.rows.filter((r) => r.id !== likedId),
        }));
        return { ...old, pages };
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.explore.feed(viewerId, { genders }), ctx.previous);
      }
    },
  });
};
