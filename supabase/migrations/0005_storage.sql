-- ============================================================================
-- Storage bucket for dish videos/posters. Object path convention:
--   menu-media/<restaurant_id>/<menu_item_id>/<filename>
-- so RLS can scope uploads to members of that restaurant.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('menu-media', 'menu-media', true)
on conflict (id) do nothing;

create policy "menu-media public read"
on storage.objects for select
using (bucket_id = 'menu-media');

create policy "menu-media owner upload"
on storage.objects for insert
with check (
  bucket_id = 'menu-media'
  and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','super_admin']::user_role[])
);

create policy "menu-media owner update"
on storage.objects for update
using (
  bucket_id = 'menu-media'
  and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','super_admin']::user_role[])
);

create policy "menu-media owner delete"
on storage.objects for delete
using (
  bucket_id = 'menu-media'
  and is_restaurant_member((storage.foldername(name))[1]::uuid, array['owner','manager','super_admin']::user_role[])
);
