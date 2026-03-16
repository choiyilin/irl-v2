alter table public.chat_rooms
add column if not exists match_id uuid references public.matches(id) on delete set null;

create unique index if not exists chat_rooms_match_id_unique
  on public.chat_rooms(match_id)
  where match_id is not null;

