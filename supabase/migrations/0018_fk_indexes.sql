-- 0018_fk_indexes.sql
-- Add btree indexes on every foreign-key column that lacked one in v1.
-- Without these, joins from these columns scanned the full child table.

create index if not exists profile_photos_user_id_idx on public.profile_photos (user_id);
create index if not exists profile_likes_liker_id_idx on public.profile_likes (liker_id);
create index if not exists profile_likes_liked_id_idx on public.profile_likes (liked_id);
create index if not exists chat_room_members_user_id_idx on public.chat_room_members (user_id);
create index if not exists chat_room_members_room_id_idx on public.chat_room_members (room_id);
create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room_id, created_at desc);
create index if not exists promotion_tickets_user_claimed_on_idx
  on public.promotion_tickets (user_id, claimed_on);
create index if not exists matches_user_low_idx on public.matches (user_low_id);
create index if not exists matches_user_high_idx on public.matches (user_high_id);
