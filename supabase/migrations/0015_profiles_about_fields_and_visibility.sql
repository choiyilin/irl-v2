alter table public.profiles
  add column if not exists occupation text;

alter table public.profiles
  add column if not exists education text;

alter table public.profiles
  add column if not exists hometown text;

alter table public.profiles
  add column if not exists height text;

alter table public.profiles
  add column if not exists show_occupation boolean not null default true;

alter table public.profiles
  add column if not exists show_education boolean not null default true;

alter table public.profiles
  add column if not exists show_city boolean not null default true;

alter table public.profiles
  add column if not exists show_hometown boolean not null default true;

alter table public.profiles
  add column if not exists show_height boolean not null default true;

