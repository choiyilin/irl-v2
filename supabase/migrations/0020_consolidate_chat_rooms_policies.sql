-- 0020_consolidate_chat_rooms_policies.sql
-- v1 had three drift-prone policies on chat_rooms. Drop them and replace with
-- one canonical SELECT/INSERT trio, keyed off chat_room_members membership.

drop policy if exists "chat_rooms_select_creator" on public.chat_rooms;
drop policy if exists "chat_rooms_select_member" on public.chat_rooms;
drop policy if exists "chat_rooms_insert_creator" on public.chat_rooms;
drop policy if exists "chat_rooms_insert_authenticated" on public.chat_rooms;

create policy "chat_rooms_select_member"
  on public.chat_rooms for select
  using (
    exists (
      select 1 from public.chat_room_members m
      where m.room_id = id and m.user_id = auth.uid()
    )
  );

-- Direct INSERTs are not allowed; rooms are only created by the
-- get_or_create_match_chat() RPC running as security definer.
create policy "chat_rooms_no_direct_insert"
  on public.chat_rooms for insert
  with check (false);

create policy "chat_rooms_no_direct_update"
  on public.chat_rooms for update
  using (false)
  with check (false);
