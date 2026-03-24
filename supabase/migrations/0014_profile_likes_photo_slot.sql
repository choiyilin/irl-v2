alter table public.profile_likes
  add column if not exists liked_photo_slot int;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_likes_liked_photo_slot_valid'
      and conrelid = 'public.profile_likes'::regclass
  ) then
    alter table public.profile_likes
      add constraint profile_likes_liked_photo_slot_valid
      check (liked_photo_slot is null or liked_photo_slot between 1 and 6);
  end if;
end $$;

