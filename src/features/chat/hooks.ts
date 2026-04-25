import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@/api/query-keys';
import { useRealtime } from '@/providers/realtime';
import { messageId, type RoomId, type UserId } from '@/lib/brand';

import { fetchMessagesPage, markRead, sendMessage } from './api';

type MessageRow = Readonly<{
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}>;

type Page = Readonly<{ rows: ReadonlyArray<MessageRow>; nextCursor: string | null }>;

export const useChatMessages = (room: RoomId) => {
  const realtime = useRealtime();
  const qc = useQueryClient();

  useEffect(() => {
    const sub = realtime.subscribe('chat_messages', `room_id=eq.${room}`, (payload) => {
      if (payload.eventType !== 'INSERT') {
        return;
      }
      const next = payload.new;
      qc.setQueryData<{ pages: ReadonlyArray<Page> }>(queryKeys.chat.messages(room), (old) => {
        if (old === undefined || old.pages.length === 0) {
          return { pages: [{ rows: [next], nextCursor: null }] };
        }
        const [first, ...rest] = old.pages;
        if (first === undefined) {
          return old;
        }
        if (first.rows.some((r) => r.id === next.id)) {
          return old;
        }
        return { ...old, pages: [{ ...first, rows: [next, ...first.rows] }, ...rest] };
      });
    });
    return () => sub.unsubscribe();
  }, [realtime, room, qc]);

  return useInfiniteQuery<Page, Error, { pages: ReadonlyArray<Page> }, readonly unknown[], string | null>({
    queryKey: queryKeys.chat.messages(room),
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const r = await fetchMessagesPage(room, pageParam);
      if (!r.ok) {
        throw r.error;
      }
      const rows = r.value;
      const last = rows.at(-1);
      return { rows, nextCursor: last !== undefined ? last.created_at : null };
    },
    getNextPageParam: (last) => (last.rows.length === 0 ? null : last.nextCursor),
  });
};

export const useSendMessage = (room: RoomId, sender: UserId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const r = await sendMessage(room, sender, body);
      if (!r.ok) {
        throw r.error;
      }
      return r.value;
    },
    onMutate: async (body) => {
      const key = queryKeys.chat.messages(room);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<{ pages: ReadonlyArray<Page> }>(key);
      const optimistic: MessageRow = {
        id: `optimistic-${Date.now().toString()}`,
        room_id: room,
        sender_id: sender,
        body,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<{ pages: ReadonlyArray<Page> }>(key, (old) => {
        if (old === undefined || old.pages.length === 0) {
          return { pages: [{ rows: [optimistic], nextCursor: null }] };
        }
        const [first, ...rest] = old.pages;
        if (first === undefined) {
          return old;
        }
        return { ...old, pages: [{ ...first, rows: [optimistic, ...first.rows] }, ...rest] };
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(queryKeys.chat.messages(room), ctx.previous);
      }
    },
  });
};

export const useMarkRead = () =>
  useMutation({
    mutationFn: async ({ rawMessageId, readerId }: { rawMessageId: string; readerId: UserId }) => {
      const r = await markRead(messageId(rawMessageId), readerId);
      if (!r.ok) {
        throw r.error;
      }
    },
  });
