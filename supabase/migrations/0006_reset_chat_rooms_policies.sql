drop policy if exists "chat_rooms_select_member" on public.chat_rooms;
drop policy if exists "chat_rooms_insert_creator" on public.chat_rooms;
drop policy if exists "chat_rooms_insert_authenticated" on public.chat_rooms;
drop policy if exists "chat_rooms_update_creator" on public.chat_rooms;
drop policy if exists "chat_rooms_delete_creator" on public.chat_rooms;

create policy "chat_rooms_select_member"
  on public.chat_rooms
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_room_members crm
      where crm.room_id = public.chat_rooms.id
        and crm.user_id = auth.uid()
    )
  );

create policy "chat_rooms_insert_creator"
  on public.chat_rooms
  for insert
  to authenticated
  with check (created_by = auth.uid());

