-- ============================================================================
-- Row Level Security — tenant isolation + role-based authorization.
-- Public (anon) read access is limited to non-sensitive, customer-facing
-- data (restaurant branding, live menu, table existence). All writes that
-- matter (orders, payments, requests) go through SECURITY DEFINER RPCs in
-- 0003_rpc.sql, which resolve restaurant/table identity from an unguessable
-- qr_token instead of trusting client-supplied ids.
-- ============================================================================

alter table restaurants enable row level security;
alter table restaurant_members enable row level security;
alter table restaurant_tables enable row level security;
alter table qr_codes enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_item_portions enable row level security;
alter table menu_media enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table customer_requests enable row level security;
alter table payments enable row level security;
alter table invoices enable row level security;
alter table notifications enable row level security;
alter table analytics_events enable row level security;
alter table ai_insights enable row level security;
alter table subscriptions enable row level security;

-- ---------------------------------------------------------------------------
create or replace function is_restaurant_member(p_restaurant_id uuid, p_roles user_role[] default null)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from restaurant_members m
    where m.restaurant_id = p_restaurant_id
      and m.user_id = auth.uid()
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

create or replace function is_super_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from restaurant_members m where m.user_id = auth.uid() and m.role = 'super_admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- restaurants: public can read active restaurants (branding for the menu).
create policy restaurants_public_read on restaurants for select
  using (is_active);
create policy restaurants_owner_write on restaurants for all
  using (is_restaurant_member(id, array['owner','super_admin']::user_role[]))
  with check (is_restaurant_member(id, array['owner','super_admin']::user_role[]));

-- restaurant_members: members can see co-members of their own restaurant.
create policy members_self_read on restaurant_members for select
  using (is_restaurant_member(restaurant_id));
create policy members_owner_write on restaurant_members for all
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]));

-- restaurant_tables: public read (needed to resolve /r/[slug]/table/[n]); writes staff-only.
create policy tables_public_read on restaurant_tables for select using (true);
create policy tables_staff_write on restaurant_tables for all
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff','super_admin']::user_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff','super_admin']::user_role[]));

create policy qr_owner_all on qr_codes for all
  using (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]));

-- menu: public read of available items; owner/manager manage.
create policy categories_public_read on menu_categories for select using (is_active);
create policy categories_owner_write on menu_categories for all
  using (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]));

create policy items_public_read on menu_items for select using (true);
create policy items_owner_write on menu_items for all
  using (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]));

create policy portions_public_read on menu_item_portions for select using (true);
create policy portions_owner_write on menu_item_portions for all
  using (is_restaurant_member(
    (select restaurant_id from menu_items where id = menu_item_id),
    array['owner','manager','super_admin']::user_role[]))
  with check (is_restaurant_member(
    (select restaurant_id from menu_items where id = menu_item_id),
    array['owner','manager','super_admin']::user_role[]));

create policy media_public_read on menu_media for select using (true);
create policy media_owner_write on menu_media for all
  using (is_restaurant_member(
    (select restaurant_id from menu_items where id = menu_item_id),
    array['owner','manager','super_admin']::user_role[]))
  with check (is_restaurant_member(
    (select restaurant_id from menu_items where id = menu_item_id),
    array['owner','manager','super_admin']::user_role[]));

-- orders / order_items / history: staff-only direct access. Anonymous
-- customers never read this table directly — they use rpc_get_order_tracking
-- (SECURITY DEFINER) which checks the access_token capability instead.
create policy orders_staff_read on orders for select
  using (is_restaurant_member(restaurant_id, array['owner','manager','chef','staff','super_admin']::user_role[]));
create policy orders_staff_update on orders for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','chef','staff','super_admin']::user_role[]));

create policy order_items_staff_read on order_items for select
  using (is_restaurant_member(
    (select restaurant_id from orders where id = order_id),
    array['owner','manager','chef','staff','super_admin']::user_role[]));

create policy status_history_staff_read on order_status_history for select
  using (is_restaurant_member(
    (select restaurant_id from orders where id = order_id),
    array['owner','manager','chef','staff','super_admin']::user_role[]));

-- customer_requests: staff read/update; creation via RPC only.
create policy requests_staff_all on customer_requests for select
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff','super_admin']::user_role[]));
create policy requests_staff_update on customer_requests for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff','super_admin']::user_role[]));

-- payments / invoices: staff-only; customer sees via RPC.
create policy payments_staff_read on payments for select
  using (is_restaurant_member(
    (select restaurant_id from orders where id = order_id),
    array['owner','manager','staff','super_admin']::user_role[]));
create policy invoices_staff_read on invoices for select
  using (is_restaurant_member(
    (select restaurant_id from orders where id = order_id),
    array['owner','manager','staff','super_admin']::user_role[]));

-- notifications: staff-only, scoped to their restaurant.
create policy notifications_staff_all on notifications for all
  using (is_restaurant_member(restaurant_id, array['owner','manager','chef','staff','super_admin']::user_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager','chef','staff','super_admin']::user_role[]));

-- analytics_events: owner/manager read; insert via RPC (SECURITY DEFINER) only.
create policy analytics_owner_read on analytics_events for select
  using (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]));

-- ai_insights: owner/manager read only; generated server-side.
create policy ai_insights_owner_read on ai_insights for select
  using (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]));

-- subscriptions: owner reads their own; super_admin reads/writes all.
create policy subscriptions_owner_read on subscriptions for select
  using (is_restaurant_member(restaurant_id, array['owner','super_admin']::user_role[]));
create policy subscriptions_admin_write on subscriptions for all
  using (is_super_admin())
  with check (is_super_admin());
