insert into public.business_promotions (
  business_name,
  category,
  description,
  address,
  latitude,
  longitude,
  is_active
)
select
  'Den Social',
  'Club',
  'Skip the line',
  'NYC',
  40.7414,
  -73.9897,
  true
where not exists (
  select 1
  from public.business_promotions
  where business_name = 'Den Social'
    and description = 'Skip the line'
);
