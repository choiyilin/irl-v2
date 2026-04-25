-- 0019_drop_unused_liked_photo_slot.sql
-- liked_photo_slot was added in v1 but never read by the frontend. Drop it,
-- but abort the migration if any non-null rows exist (so we don't silently
-- destroy meaningful data).

do $$
declare
  non_null_count bigint;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_likes'
      and column_name = 'liked_photo_slot'
  ) then
    select count(*) into non_null_count from public.profile_likes where liked_photo_slot is not null;
    if non_null_count > 0 then
      raise exception 'profile_likes.liked_photo_slot has % non-null rows; refusing to drop', non_null_count;
    end if;
    alter table public.profile_likes drop column liked_photo_slot;
  end if;
end $$;
