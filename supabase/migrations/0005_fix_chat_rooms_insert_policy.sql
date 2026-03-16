drop policy if exists "chat_rooms_insert_creator" on public.chat_rooms;

create policy "chat_rooms_insert_authenticated"
  on public.chat_rooms
  for insert
  to authenticated
  with check (auth.uid() is not null);

