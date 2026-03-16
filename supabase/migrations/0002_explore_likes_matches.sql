create table if not exists public.profile_likes (
  liker_id uuid not null references auth.users(id) on delete cascade,
  liked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, liked_id),
  constraint profile_likes_not_self check (liker_id <> liked_id)
);

create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint matches_not_self check (user_a <> user_b),
  constraint matches_unique_pair unique (user_a, user_b),
  constraint matches_ordered_pair check (user_a < user_b)
);

alter table public.profile_likes enable row level security;
alter table public.matches enable row level security;

create policy "profile_likes_select_participants"
  on public.profile_likes
  for select
  to authenticated
  using (auth.uid() = liker_id or auth.uid() = liked_id);

create policy "profile_likes_insert_own"
  on public.profile_likes
  for insert
  to authenticated
  with check (auth.uid() = liker_id);

create policy "matches_select_participants"
  on public.matches
  for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "matches_insert_participants"
  on public.matches
  for insert
  to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);

