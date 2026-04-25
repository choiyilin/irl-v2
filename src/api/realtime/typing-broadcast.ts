import { type AppSupabaseClient } from '@/api/supabase/client';
import { type RoomId, type UserId } from '@/lib/brand';

export type TypingEvent = Readonly<{ userId: UserId; at: number }>;

export type TypingBroadcast = Readonly<{
  send: (userId: UserId) => Promise<void>;
  subscribe: (handler: (e: TypingEvent) => void) => () => void;
}>;

export const createTypingBroadcast = (client: AppSupabaseClient, roomId: RoomId): TypingBroadcast => {
  const channel = client.channel(`chat:room:${roomId}`, { config: { broadcast: { self: false } } });
  void channel.subscribe();

  const subscribe = (handler: (e: TypingEvent) => void): (() => void) => {
    const wrapped = (payload: { payload: TypingEvent }): void => {
      handler(payload.payload);
    };
    channel.on('broadcast', { event: 'typing' }, wrapped);
    return () => {
      void channel.unsubscribe();
    };
  };

  const send = async (userId: UserId): Promise<void> => {
    await channel.send({ type: 'broadcast', event: 'typing', payload: { userId, at: Date.now() } });
  };

  return { send, subscribe };
};
