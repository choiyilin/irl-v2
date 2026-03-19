alter table public.business_promotions
  add column if not exists max_claims int not null default 1;

create table if not exists public.promotion_tickets (
  id uuid primary key default uuid_generate_v4(),
  promotion_id uuid not null references public.business_promotions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (promotion_id, user_id)
);

alter table public.promotion_tickets enable row level security;

drop policy if exists "promotion_tickets_select_own" on public.promotion_tickets;
create policy "promotion_tickets_select_own"
  on public.promotion_tickets
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "promotion_tickets_insert_own" on public.promotion_tickets;
create policy "promotion_tickets_insert_own"
  on public.promotion_tickets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

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
  where pt.promotion_id = p_promotion_id;

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
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

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
    and pt.user_id = v_user_id;

  if v_existing_ticket is not null then
    select count(*)
      into v_claimed_count
    from public.promotion_tickets pt
    where pt.promotion_id = p_promotion_id;

    return query select v_existing_ticket, greatest(v_max_claims - v_claimed_count, 0);
    return;
  end if;

  select count(*)
    into v_claimed_count
  from public.promotion_tickets pt
  where pt.promotion_id = p_promotion_id;

  if v_claimed_count >= v_max_claims then
    raise exception 'Deal sold out';
  end if;

  insert into public.promotion_tickets (promotion_id, user_id)
  values (p_promotion_id, v_user_id)
  returning id into v_new_ticket;

  return query select v_new_ticket, greatest(v_max_claims - (v_claimed_count + 1), 0);
end;
$$;

grant execute on function public.claim_promotion_ticket(uuid) to authenticated;

update public.business_promotions
set max_claims = 10
where business_name = 'Den Social'
  and description = 'Skip the line'
  and max_claims = 1;
