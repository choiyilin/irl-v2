-- Tickets should be re-claimable on a new day (but not reusable tomorrow).
-- We model this as a per-day key and enforce it via a unique constraint.

alter table public.promotion_tickets
  add column if not exists claim_date date;

update public.promotion_tickets
set claim_date = (claimed_at at time zone 'utc')::date
where claim_date is null;

alter table public.promotion_tickets
  alter column claim_date set not null;

alter table public.promotion_tickets
  alter column claim_date set default ((now() at time zone 'utc')::date);

do $$
begin
  -- Drop legacy uniqueness (promotion_id, user_id) if it exists.
  if exists (
    select 1
    from pg_constraint
    where conname = 'promotion_tickets_promotion_id_user_id_key'
  ) then
    alter table public.promotion_tickets
      drop constraint promotion_tickets_promotion_id_user_id_key;
  end if;
end $$;

do $$
begin
  -- If a previous run created an index/constraint with this name, normalize first.
  if exists (
    select 1
    from pg_constraint
    where conname = 'promotion_tickets_unique_per_day'
  ) then
    alter table public.promotion_tickets
      drop constraint promotion_tickets_unique_per_day;
  elsif exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'i'
      and c.relname = 'promotion_tickets_unique_per_day'
      and n.nspname = 'public'
  ) then
    drop index public.promotion_tickets_unique_per_day;
  end if;

  alter table public.promotion_tickets
    add constraint promotion_tickets_unique_per_day
    unique (promotion_id, user_id, claim_date);
end $$;

create or replace function public.get_promotion_availability(p_promotion_id uuid)
returns table (
  max_claims int,
  claimed_count int,
  remaining_count int,
  already_claimed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_max_claims int;
  v_claimed_count int;
  v_today date;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_today := (now() at time zone 'utc')::date;

  select bp.max_claims
    into v_max_claims
  from public.business_promotions bp
  where bp.id = p_promotion_id
    and bp.is_active = true;

  if v_max_claims is null then
    raise exception 'Promotion not found or inactive';
  end if;

  select count(*)
    into v_claimed_count
  from public.promotion_tickets pt
  where pt.promotion_id = p_promotion_id
    and pt.claim_date = v_today;

  return query
    select
      v_max_claims,
      v_claimed_count,
      greatest(v_max_claims - v_claimed_count, 0),
      exists (
        select 1
        from public.promotion_tickets mine
        where mine.promotion_id = p_promotion_id
          and mine.user_id = v_user_id
          and mine.claim_date = v_today
      );
end;
$$;

grant execute on function public.get_promotion_availability(uuid) to authenticated;

create or replace function public.claim_promotion_ticket(p_promotion_id uuid)
returns table (
  ticket_id uuid,
  remaining_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_max_claims int;
  v_claimed_count int;
  v_existing_ticket uuid;
  v_new_ticket uuid;
  v_today date;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_today := (now() at time zone 'utc')::date;

  select bp.max_claims
    into v_max_claims
  from public.business_promotions bp
  where bp.id = p_promotion_id
    and bp.is_active = true
  for update;

  if v_max_claims is null then
    raise exception 'Promotion not found or inactive';
  end if;

  select pt.id
    into v_existing_ticket
  from public.promotion_tickets pt
  where pt.promotion_id = p_promotion_id
    and pt.user_id = v_user_id
    and pt.claim_date = v_today;

  if v_existing_ticket is not null then
    select count(*)
      into v_claimed_count
    from public.promotion_tickets pt
    where pt.promotion_id = p_promotion_id
      and pt.claim_date = v_today;

    return query select v_existing_ticket, greatest(v_max_claims - v_claimed_count, 0);
    return;
  end if;

  select count(*)
    into v_claimed_count
  from public.promotion_tickets pt
  where pt.promotion_id = p_promotion_id
    and pt.claim_date = v_today;

  if v_claimed_count >= v_max_claims then
    raise exception 'Deal sold out';
  end if;

  insert into public.promotion_tickets (promotion_id, user_id, claim_date)
  values (p_promotion_id, v_user_id, v_today)
  returning id into v_new_ticket;

  return query select v_new_ticket, greatest(v_max_claims - (v_claimed_count + 1), 0);
end;
$$;

grant execute on function public.claim_promotion_ticket(uuid) to authenticated;

