import { supabase } from '@/api/supabase/client';
import { wrap } from '@/api/supabase/wrap';
import { type MessageId, type RoomId, type UserId } from '@/lib/brand';

const PAGE_SIZE = 30;

export const fetchMessagesPage = async (room: RoomId, before: string | null) => {
  let query = supabase
    .from('chat_messages')
    .select('id, room_id, sender_id, body, created_at')
    .eq('room_id', room)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (before !== null) {
    query = query.lt('created_at', before);
  }
  return wrap(query);
};

export const sendMessage = async (room: RoomId, sender: UserId, body: string) =>
  wrap(
    supabase
      .from('chat_messages')
      .insert({ room_id: room, sender_id: sender, body })
      .select('id, room_id, sender_id, body, created_at')
      .single(),
  );

export const markRead = async (message: MessageId, reader: UserId) =>
  wrap(
    supabase
      .from('chat_receipts')
      .upsert({ message_id: message, reader_id: reader })
      .select('message_id')
      .single(),
  );
