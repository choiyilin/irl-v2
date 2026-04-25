-- 0024_missed_connections_perf_and_rpc.sql
-- Composite index for the missed-connections query. Also rewrite
-- get_missed_connections() to accept (limit, after) keyset cursor and bound
-- the result so the client doesn't pull unbounded rows.

create index if not exists promotion_tickets_promo_day_user_idx
  on public.promotion_tickets (promotion_id, claimed_on, user_id);

drop function if exists public.get_missed_connections();

create or replace function public.get_missed_connections(
  p_limit int,
  p_after timestamptz default null
)
returns table (
  other_user_id uuid,
  display_name text,
  age int,
  photo_storage_path text,
  promotion_id uuid,
  business_name text,
  category text,
  description text,
  claimed_on date,
  claimed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with my_claims as (
    select promotion_id, claimed_on, claimed_at
    from public.promotion_tickets
    where user_id = auth.uid()
  ),
  candidates as (
    select distinct on (t.user_id)
      t.user_id as other_user_id,
      t.promotion_id,
      t.claimed_on,
      t.claimed_at
    from public.promotion_tickets t
    join my_claims mc on mc.promotion_id = t.promotion_id and mc.claimed_on = t.claimed_on
    where t.user_id <> auth.uid()
      and not exists (
        select 1 from public.matches m
        where (m.user_low_id = auth.uid() and m.user_high_id = t.user_id)
           or (m.user_high_id = auth.uid() and m.user_low_id = t.user_id)
      )
      and (p_after is null or t.claimed_at < p_after)
    order by t.user_id, t.claimed_at desc
  )
  select
    c.other_user_id,
    p.display_name,
    p.age,
    ph.storage_path as photo_storage_path,
    bp.id as promotion_id,
    bp.business_name,
    bp.category,
    bp.description,
    c.claimed_on,
    c.claimed_at
  from candidates c
  join public.profiles p on p.id = c.other_user_id
  left join public.profile_photos ph on ph.user_id = c.other_user_id and ph.slot_index = 0
  join public.business_promotions bp on bp.id = c.promotion_id
  order by c.claimed_at desc
  limit greatest(1, least(p_limit, 50));
$$;

revoke all on function public.get_missed_connections(int, timestamptz) from public;
grant execute on function public.get_missed_connections(int, timestamptz) to authenticated;
