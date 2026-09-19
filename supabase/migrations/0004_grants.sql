-- ============================================================================
-- Explicit grants. RLS above still governs row visibility; these grants only
-- open the door at the table/function level for the anon and authenticated
-- API roles Supabase issues to the browser.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select on
  restaurants, restaurant_tables, menu_categories, menu_items,
  menu_item_portions, menu_media
to anon, authenticated;

grant select, update on
  restaurants, restaurant_members, restaurant_tables, qr_codes,
  menu_categories, menu_items, menu_item_portions, menu_media,
  orders, order_items, order_status_history, customer_requests,
  payments, invoices, notifications, analytics_events, ai_insights,
  subscriptions
to authenticated;

grant insert, delete on
  restaurant_tables, qr_codes, menu_categories, menu_items,
  menu_item_portions, menu_media, restaurant_members, notifications
to authenticated;

grant execute on function
  rpc_resolve_table(text, int),
  rpc_place_order(uuid, jsonb, text),
  rpc_get_order_tracking(uuid, uuid),
  rpc_create_request(uuid, request_type),
  rpc_track_event(uuid, text, uuid, jsonb),
  rpc_record_sandbox_payment(uuid, uuid, payment_method),
  rpc_get_receipt(uuid, uuid)
to anon, authenticated;

grant execute on function
  rpc_update_order_status(uuid, order_status)
to authenticated;
