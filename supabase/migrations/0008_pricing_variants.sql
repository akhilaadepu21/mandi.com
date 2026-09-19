-- ============================================================================
-- Real menu pricing structures differ per dish (a flat single price, a
-- Small/Medium/Large/Extra Large variant set, or a flat package price) —
-- this makes that structure explicit instead of inferring it from which
-- columns happen to be null, and lets the owner disable one size without
-- deleting its price history.
-- ============================================================================

create type pricing_type as enum ('single', 'variants', 'package');

alter table menu_items add column pricing_type pricing_type not null default 'single';
alter table menu_item_portions add column is_enabled boolean not null default true;

-- Backfill: any item that already has portions is a 'variants' item.
update menu_items set pricing_type = 'variants'
where id in (select distinct menu_item_id from menu_item_portions);

-- ---------------------------------------------------------------------------
-- Re-validate rpc_place_order against pricing_type, in addition to the
-- existing "price must be set" check — a customer can no longer order a
-- variants dish without picking a size, or send a size for a flat-priced one.
create or replace function rpc_place_order(
  p_qr_token uuid,
  p_items jsonb,
  p_special_instructions text default null
)
returns table(order_id uuid, access_token uuid, order_number int, estimated_ready_minutes int)
language plpgsql security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_table_id uuid;
  v_order_id uuid;
  v_access_token uuid;
  v_order_number int;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_menu_item menu_items%rowtype;
  v_portion menu_item_portions%rowtype;
  v_has_portion_id boolean;
  v_price numeric;
  v_max_prep int := 0;
begin
  select t.restaurant_id, t.id into v_restaurant_id, v_table_id
  from restaurant_tables t where t.qr_token = p_qr_token;

  if v_restaurant_id is null then
    raise exception 'invalid_table' using errcode = 'P0002';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order' using errcode = 'P0001';
  end if;

  insert into orders (restaurant_id, table_id, special_instructions)
  values (v_restaurant_id, v_table_id, nullif(trim(p_special_instructions), ''))
  returning orders.id, orders.access_token, orders.order_number into v_order_id, v_access_token, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_menu_item from menu_items
      where id = (v_item->>'menu_item_id')::uuid
        and restaurant_id = v_restaurant_id
        and is_available = true;

    if v_menu_item.id is null then
      raise exception 'item_unavailable' using errcode = 'P0003';
    end if;

    v_has_portion_id := (v_item ? 'portion_id') and (v_item->>'portion_id') is not null;
    v_portion := null;

    if v_menu_item.pricing_type = 'variants' then
      if not v_has_portion_id then
        raise exception 'portion_required' using errcode = 'P0006';
      end if;
      select * into v_portion from menu_item_portions
        where id = (v_item->>'portion_id')::uuid
          and menu_item_id = v_menu_item.id
          and is_enabled = true;
      if v_portion.id is null then
        raise exception 'portion_unavailable' using errcode = 'P0004';
      end if;
      v_price := v_portion.price;
    else
      if v_has_portion_id then
        raise exception 'portion_not_applicable' using errcode = 'P0007';
      end if;
      v_price := v_menu_item.base_price;
    end if;

    if v_price is null then
      raise exception 'price_not_set' using errcode = 'P0005';
    end if;

    insert into order_items (
      order_id, menu_item_id, portion_id, name_snapshot, portion_label_snapshot,
      price_snapshot, quantity, special_instructions
    ) values (
      v_order_id, v_menu_item.id, v_portion.id, v_menu_item.name, v_portion.label,
      v_price, greatest((v_item->>'quantity')::int, 1),
      nullif(trim(v_item->>'special_instructions'), '')
    );

    v_subtotal := v_subtotal + v_price * greatest((v_item->>'quantity')::int, 1);
    v_max_prep := greatest(v_max_prep, coalesce(v_menu_item.prep_time_minutes, 0));
  end loop;

  update orders o set
    subtotal = v_subtotal,
    tax = (select tax from calc_order_totals(v_subtotal)),
    service_charge = (select service_charge from calc_order_totals(v_subtotal)),
    total = (select total from calc_order_totals(v_subtotal)),
    estimated_ready_minutes = greatest(v_max_prep, 10)
  where o.id = v_order_id;

  update restaurant_tables set status = 'ordering' where id = v_table_id;

  insert into analytics_events (restaurant_id, event_type, table_id, order_id)
  values (v_restaurant_id, 'order_created', v_table_id, v_order_id);

  return query select v_order_id, v_access_token, v_order_number,
    greatest(v_max_prep, 10);
end;
$$;

-- Public read already covers menu_item_portions; owners can now also toggle
-- is_enabled via the existing portions_owner_write policy (unchanged).
