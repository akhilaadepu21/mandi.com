-- ============================================================================
-- Public, privacy-safe "frequently ordered together" lookup. Anonymous
-- customers may not read order_items directly (RLS restricts that to staff),
-- so this SECURITY DEFINER RPC returns only aggregated item/count pairs —
-- never individual orders — and resolves the restaurant from the qr_token
-- rather than trusting a client-supplied restaurant_id.
-- ============================================================================

create or replace function rpc_frequently_ordered_with(
  p_qr_token uuid, p_menu_item_id uuid, p_limit int default 3
)
returns table(menu_item_id uuid, name text, times_ordered_together bigint)
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  select t.restaurant_id into v_restaurant_id from restaurant_tables t where t.qr_token = p_qr_token;
  if v_restaurant_id is null then
    return;
  end if;

  return query
  select oi2.menu_item_id, oi2.name_snapshot, count(*)::bigint
  from order_items oi1
  join orders o on o.id = oi1.order_id and o.restaurant_id = v_restaurant_id
  join order_items oi2 on oi2.order_id = oi1.order_id and oi2.menu_item_id != p_menu_item_id
  where oi1.menu_item_id = p_menu_item_id
  group by oi2.menu_item_id, oi2.name_snapshot
  order by count(*) desc
  limit p_limit;
end;
$$;

grant execute on function rpc_frequently_ordered_with(uuid, uuid, int) to anon, authenticated;
