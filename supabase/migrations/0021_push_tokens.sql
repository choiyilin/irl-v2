-- 0021_push_tokens.sql
-- Per-device push tokens. Token is the primary key so the same device
-- (re-)installing replaces its previous row.

create table if not exists public.push_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  token text primary key,
  platform text not null check (platform in ('ios')),
  last_seen timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens_select_self"
  on public.push_tokens for select
  using (user_id = auth.uid());

create policy "push_tokens_upsert_self"
  on public.push_tokens for insert
  with check (user_id = auth.uid());

create policy "push_tokens_update_self"
  on public.push_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_tokens_delete_self"
  on public.push_tokens for delete
  using (user_id = auth.uid());
