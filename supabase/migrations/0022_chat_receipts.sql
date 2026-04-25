-- 0022_chat_receipts.sql
-- Read receipts. One row per (message, reader). The reader is anyone in the
-- room other than the sender; insertion is gated by membership and authorship.

create table if not exists public.chat_receipts (
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  reader_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, reader_id)
);

create index if not exists chat_receipts_reader_idx on public.chat_receipts (reader_id, read_at desc);

alter table public.chat_receipts enable row level security;

-- Read receipts visible to anyone in the same room.
create policy "chat_receipts_select_room_member"
  on public.chat_receipts for select
  using (
    exists (
      select 1
      from public.chat_messages msg
      join public.chat_room_members mem on mem.room_id = msg.room_id
      where msg.id = chat_receipts.message_id
        and mem.user_id = auth.uid()
    )
  );

-- Self-only insert; reader must be a member of the message's room and not the sender.
create policy "chat_receipts_insert_self_member"
  on public.chat_receipts for insert
  with check (
    reader_id = auth.uid()
    and exists (
      select 1
      from public.chat_messages msg
      join public.chat_room_members mem on mem.room_id = msg.room_id
      where msg.id = chat_receipts.message_id
        and mem.user_id = auth.uid()
        and msg.sender_id <> auth.uid()
    )
  );

-- Backfill: synthesize read receipts for every existing message for every non-sender member.
-- This ensures pre-cutover history isn't shown as unread when v2 ships.
insert into public.chat_receipts (message_id, reader_id, read_at)
select msg.id, mem.user_id, msg.created_at
from public.chat_messages msg
join public.chat_room_members mem on mem.room_id = msg.room_id and mem.user_id <> msg.sender_id
on conflict (message_id, reader_id) do nothing;
