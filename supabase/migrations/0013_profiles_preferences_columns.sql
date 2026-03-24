-- Store onboarding preference fields on `public.profiles` so the client can
-- filter explore feeds without needing admin access to `auth.users`.

alter table public.profiles
  add column if not exists gender text;

alter table public.profiles
  add column if not exists sexual_orientation text;

alter table public.profiles
  add column if not exists interested_in_seeing text;

