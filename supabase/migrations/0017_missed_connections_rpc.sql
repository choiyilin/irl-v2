-- Missed connections: users who claimed the same promotion ticket on the same day (UTC).
-- We exclude existing matches and return the most recent shared event per user.

create or replace function public.get_missed_connections()
returns table (
  other_user_id uuid,
  display_name text,
  age int,
  photo_storage_path text,
  promotion_id uuid,
  business_name text,
  category text,
  description text,
  claim_date date,
  claimed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as user_id
  ),
  my_tickets as (
    select pt.promotion_id, pt.claim_date
    from public.promotion_tickets pt
    join me on me.user_id = pt.user_id
  ),
  shared as (
    select
      pt.user_id as other_user_id,
      pt.promotion_id,
      pt.claim_date,
      pt.claimed_at
    from public.promotion_tickets pt
    join my_tickets mt
      on mt.promotion_id = pt.promotion_id
     and mt.claim_date = pt.claim_date
    join me on true
    where pt.user_id <> me.user_id
  ),
  shared_dedup as (
    select distinct on (s.other_user_id)
      s.other_user_id,
      s.promotion_id,
      s.claim_date,
      s.claimed_at
    from shared s
    order by s.other_user_id, s.claim_date desc, s.claimed_at desc
  )
  select
    sd.other_user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Member') as display_name,
    p.age,
    pp.storage_path as photo_storage_path,
    bp.id as promotion_id,
    bp.business_name,
    bp.category,
    bp.description,
    sd.claim_date,
    sd.claimed_at
  from shared_dedup sd
  join public.business_promotions bp on bp.id = sd.promotion_id
  left join public.profiles p on p.id = sd.other_user_id
  left join public.profile_photos pp
    on pp.user_id = sd.other_user_id
   and pp.slot_index = 1
  join me on true
  where not exists (
    select 1
    from public.matches m
    where (m.user_a = me.user_id and m.user_b = sd.other_user_id)
       or (m.user_b = me.user_id and m.user_a = sd.other_user_id)
  )
  order by sd.claim_date desc, sd.claimed_at desc;
$$;

grant execute on function public.get_missed_connections() to authenticated;

create or replace function public.has_missed_connection(p_other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as user_id
  )
  select exists (
    select 1
    from public.promotion_tickets mine
    join public.promotion_tickets theirs
      on theirs.promotion_id = mine.promotion_id
     and theirs.claim_date = mine.claim_date
    join me on me.user_id = mine.user_id
    where theirs.user_id = p_other_user_id
      and theirs.user_id <> me.user_id
  );
$$;

grant execute on function public.has_missed_connection(uuid) to authenticated;

