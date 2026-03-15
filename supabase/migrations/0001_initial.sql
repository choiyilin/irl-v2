-- IRL MVP schema
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  city text,
  age int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_promotions (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  category text not null,
  description text not null,
  address text,
  latitude double precision,
  longitude double precision,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.business_promotions enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;

-- profiles policies
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- promotions policies
create policy "promotions_select_authenticated"
  on public.business_promotions
  for select
  to authenticated
  using (is_active = true);

create policy "promotions_insert_authenticated"
  on public.business_promotions
  for insert
  to authenticated
  with check (auth.uid() = created_by);

-- chat room policies
create policy "chat_rooms_select_member"
  on public.chat_rooms
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_room_members crm
      where crm.room_id = id and crm.user_id = auth.uid()
    )
  );

create policy "chat_rooms_insert_creator"
  on public.chat_rooms
  for insert
  to authenticated
  with check (auth.uid() = created_by);

-- chat room members policies
create policy "chat_room_members_select_member"
  on public.chat_room_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_room_members crm
      where crm.room_id = room_id and crm.user_id = auth.uid()
    )
  );

create policy "chat_room_members_insert_creator"
  on public.chat_room_members
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.chat_rooms rooms
      where rooms.id = room_id and rooms.created_by = auth.uid()
    )
  );

-- chat message policies
create policy "chat_messages_select_member"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_room_members crm
      where crm.room_id = room_id and crm.user_id = auth.uid()
    )
  );

create policy "chat_messages_insert_sender_is_member"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.chat_room_members crm
      where crm.room_id = room_id and crm.user_id = auth.uid()
    )
  );

