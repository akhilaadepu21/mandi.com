-- ============================================================================
-- Authorization fixes:
--   1. A disabled/no-profile account currently looks identical to "not a
--      member at all" to the app, because is_restaurant_member() (used by
--      the RLS policy that guards reading your OWN restaurant_members row)
--      excludes disabled rows — so the app can't tell "you have no profile"
--      from "your profile is disabled" from "you're just not logged in".
--      rpc_get_my_membership() fixes this: it's SECURITY DEFINER and always
--      returns the CALLER's own row(s) regardless of is_disabled, which is
--      safe (you can always see your own account status) and lets the app
--      show the right message instead of a generic redirect.
--   2. has_permission() gave 'manager' automatic full access to every
--      permission, which contradicts "manager access should depend on
--      permissions the owner has granted" — only owner/super_admin now
--      auto-pass; manager (like chef/staff) needs the permission explicitly.
--   3. Extend the menu/QR/analytics/staff RLS policies so manager access to
--      those specific capabilities also goes through has_permission(),
--      instead of being unconditional for the whole role.
-- ============================================================================

create or replace function rpc_get_my_membership()
returns table(
  restaurant_id uuid, role user_role, is_disabled boolean, full_name text, email text,
  permissions text[], restaurant_name text, restaurant_slug text
)
language sql security definer stable
set search_path = public
as $$
  select m.restaurant_id, m.role, m.is_disabled, m.full_name, m.email, m.permissions,
         r.name, r.slug
  from restaurant_members m
  join restaurants r on r.id = m.restaurant_id
  where m.user_id = auth.uid()
  order by
    case m.role
      when 'super_admin' then 0
      when 'owner' then 1
      when 'manager' then 2
      when 'chef' then 3
      when 'staff' then 4
      else 5
    end,
    m.created_at
  limit 1;
$$;

grant execute on function rpc_get_my_membership() to authenticated;

-- ---------------------------------------------------------------------------
create or replace function has_permission(p_restaurant_id uuid, p_permission text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from restaurant_members m
    where m.restaurant_id = p_restaurant_id
      and m.user_id = auth.uid()
      and not m.is_disabled
      and (m.role in ('owner', 'super_admin') or p_permission = any(m.permissions))
  );
$$;

-- ---------------------------------------------------------------------------
-- Menu management: owner/super_admin always; manager only with 'manage_menu'.
drop policy if exists categories_owner_write on menu_categories;
create policy categories_owner_write on menu_categories for all
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_menu'))
  with check (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_menu'));

drop policy if exists items_owner_write on menu_items;
create policy items_owner_write on menu_items for all
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_menu'))
  with check (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_menu'));

drop policy if exists portions_owner_write on menu_item_portions;
create policy portions_owner_write on menu_item_portions for all
  using (
    is_restaurant_member((select restaurant_id from menu_items where id = menu_item_id), array['owner','super_admin']::user_role[])
    or has_permission((select restaurant_id from menu_items where id = menu_item_id), 'manage_menu')
  )
  with check (
    is_restaurant_member((select restaurant_id from menu_items where id = menu_item_id), array['owner','super_admin']::user_role[])
    or has_permission((select restaurant_id from menu_items where id = menu_item_id), 'manage_menu')
  );

drop policy if exists media_owner_write on menu_media;
create policy media_owner_write on menu_media for all
  using (
    is_restaurant_member((select restaurant_id from menu_items where id = menu_item_id), array['owner','super_admin']::user_role[])
    or has_permission((select restaurant_id from menu_items where id = menu_item_id), 'manage_menu')
  )
  with check (
    is_restaurant_member((select restaurant_id from menu_items where id = menu_item_id), array['owner','super_admin']::user_role[])
    or has_permission((select restaurant_id from menu_items where id = menu_item_id), 'manage_menu')
  );

-- QR / table structure management: owner/super_admin always; manager only with 'manage_qr'.
drop policy if exists qr_owner_all on qr_codes;
create policy qr_owner_all on qr_codes for all
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_qr'))
  with check (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_qr'));

drop policy if exists tables_manage_insert on restaurant_tables;
create policy tables_manage_insert on restaurant_tables for insert
  with check (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_qr'));

drop policy if exists tables_manage_delete on restaurant_tables;
create policy tables_manage_delete on restaurant_tables for delete
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_qr'));

-- Analytics: owner/super_admin always; manager only with 'view_analytics'.
drop policy if exists analytics_owner_read on analytics_events;
create policy analytics_owner_read on analytics_events for select
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'view_analytics'));

drop policy if exists ai_insights_owner_read on ai_insights;
create policy ai_insights_owner_read on ai_insights for select
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'view_analytics'));

-- Staff roster management: owner/super_admin always; manager only with 'manage_staff'
-- (actual create/disable/delete goes through the /api/staff routes which check
-- this in application code with the service role, but direct table writes —
-- e.g. editing a permissions array — must be equally guarded).
drop policy if exists members_owner_write on restaurant_members;
create policy members_owner_write on restaurant_members for all
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_staff'))
  with check (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]) or has_permission(restaurant_id, 'manage_staff'));
