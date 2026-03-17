create table if not exists public.profile_photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_index int not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists profile_photos_user_slot_unique
  on public.profile_photos(user_id, slot_index);

alter table public.profile_photos enable row level security;

drop policy if exists "profile_photos_select_own" on public.profile_photos;
create policy "profile_photos_select_own"
  on public.profile_photos
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "profile_photos_insert_own" on public.profile_photos;
create policy "profile_photos_insert_own"
  on public.profile_photos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profile_photos_update_own" on public.profile_photos;
create policy "profile_photos_update_own"
  on public.profile_photos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile_photos_delete_own" on public.profile_photos;
create policy "profile_photos_delete_own"
  on public.profile_photos
  for delete
  to authenticated
  using (auth.uid() = user_id);
