drop policy if exists "chat_room_members_select_member" on public.chat_room_members;
drop policy if exists "chat_room_members_select_own" on public.chat_room_members;
drop policy if exists "chat_room_members_insert_creator" on public.chat_room_members;

create policy "chat_room_members_select_own"
  on public.chat_room_members
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "chat_room_members_insert_self_or_room_creator"
  on public.chat_room_members
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.chat_rooms rooms
      where rooms.id = room_id
        and rooms.created_by = auth.uid()
    )
  );

create or replace function public.get_or_create_match_chat(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_room_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select m.user_a, m.user_b
  into v_user_a, v_user_b
  from public.matches m
  where m.id = p_match_id
    and (m.user_a = v_uid or m.user_b = v_uid)
  limit 1;

  if v_user_a is null or v_user_b is null then
    raise exception 'Match not found for user';
  end if;

  select r.id
  into v_room_id
  from public.chat_rooms r
  where r.match_id = p_match_id
  limit 1;

  if v_room_id is null then
    insert into public.chat_rooms (created_by, match_id)
    values (v_uid, p_match_id)
    returning id into v_room_id;
  end if;

  insert into public.chat_room_members (room_id, user_id)
  values
    (v_room_id, v_user_a),
    (v_room_id, v_user_b)
  on conflict (room_id, user_id) do nothing;

  return v_room_id;
end;
$$;

grant execute on function public.get_or_create_match_chat(uuid) to authenticated;

