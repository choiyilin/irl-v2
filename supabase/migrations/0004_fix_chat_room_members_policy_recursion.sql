drop policy if exists "chat_room_members_select_member" on public.chat_room_members;

create policy "chat_room_members_select_own"
  on public.chat_room_members
  for select
  to authenticated
  using (auth.uid() = user_id);

