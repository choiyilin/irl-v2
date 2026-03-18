drop policy if exists "profile_photos_select_own" on public.profile_photos;
create policy "profile_photos_select_authenticated"
  on public.profile_photos
  for select
  to authenticated
  using (true);

drop policy if exists "profile_photos_bucket_select_own" on storage.objects;
create policy "profile_photos_bucket_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'profile-photos');
