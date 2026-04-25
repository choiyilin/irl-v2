-- 0023_not_null_and_checks.sql
-- Tighten profile invariants. Add onboarding_complete column (default false)
-- and gate stricter NOT-NULLs by it via partial CHECK constraints, so existing
-- in-flight users aren't broken.

-- onboarding_complete column.
alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

-- Backfill: users with display_name and birthdate are considered done.
update public.profiles
set onboarding_complete = true
where onboarding_complete = false
  and coalesce(display_name, '') <> ''
  and birthdate is not null;

-- display_name must always be non-null and non-empty.
update public.profiles set display_name = '(unknown)' where display_name is null;
alter table public.profiles alter column display_name set not null;
alter table public.profiles
  add constraint profiles_display_name_non_empty check (length(display_name) > 0);

-- birthdate required once onboarding is complete.
alter table public.profiles
  add constraint profiles_birthdate_required_when_complete
  check (onboarding_complete = false or birthdate is not null);

-- Photo slot must be 0..5.
alter table public.profile_photos
  add constraint profile_photos_slot_index_range
  check (slot_index between 0 and 5);

-- Gender enum (loose; values come from product, not auth).
alter table public.profiles
  add constraint profiles_gender_known
  check (gender is null or gender in ('man', 'woman', 'non_binary', 'self_describe'));
