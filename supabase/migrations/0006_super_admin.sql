-- ============================================================================
-- Platform-wide read access for super_admin. is_restaurant_member() is scoped
-- to one restaurant_id, which correctly limits owners/staff — but a
-- super_admin needs to see across all restaurants for the platform dashboard.
-- These additive policies grant that, read-only.
-- ============================================================================

create policy restaurants_super_admin_read on restaurants for select
  using (is_super_admin());

create policy orders_super_admin_read on orders for select
  using (is_super_admin());

create policy order_items_super_admin_read on order_items for select
  using (is_super_admin());

create policy payments_super_admin_read on payments for select
  using (is_super_admin());

create policy restaurant_members_super_admin_read on restaurant_members for select
  using (is_super_admin());

create policy restaurant_tables_super_admin_read on restaurant_tables for select
  using (is_super_admin());
