-- ============================================================================
-- SECURITY DEFINER RPCs — the only write path for anonymous customers.
-- Every one resolves restaurant/table identity from an unguessable qr_token
-- (never from a client-supplied restaurant_id/table_id) and computes prices
-- from the database (never trusts a client-supplied price).
-- ============================================================================

-- Tax / service charge configuration kept simple and centralized here.
create or replace function calc_order_totals(p_subtotal numeric)
returns table(tax numeric, service_charge numeric, total numeric)
language sql immutable
as $$
  select
    round(p_subtotal * 0.05, 2) as tax,
    round(p_subtotal * 0.05, 2) as service_charge,
    round(p_subtotal * 1.10, 2) as total;
$$;

-- ---------------------------------------------------------------------------
-- Resolve a table from its qr_token. Used by the server component that
-- renders /r/[slug]/table/[n] so the browser is never trusted with ids.
create or replace function rpc_resolve_table(p_slug text, p_table_number int)
returns table(
  restaurant_id uuid, table_id uuid, qr_token uuid, table_status table_status,
  restaurant_name text, restaurant_tagline text, restaurant_logo_url text,
  restaurant_hero_video_url text, restaurant_hero_poster_url text, primary_color text
)
language sql security definer stable
set search_path = public
as $$
  select r.id, t.id, t.qr_token, t.status, r.name, r.tagline, r.logo_url,
         r.hero_video_url, r.hero_poster_url, r.primary_color
  from restaurants r
  join restaurant_tables t on t.restaurant_id = r.id
  where r.slug = p_slug and t.table_number = p_table_number and r.is_active;
$$;

-- ---------------------------------------------------------------------------
-- p_items: jsonb array of { menu_item_id, portion_id, quantity, special_instructions }
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

    v_price := v_menu_item.base_price;
    v_portion := null;

    if v_item ? 'portion_id' and (v_item->>'portion_id') is not null then
      select * into v_portion from menu_item_portions
        where id = (v_item->>'portion_id')::uuid and menu_item_id = v_menu_item.id;
      if v_portion.id is null then
        raise exception 'portion_unavailable' using errcode = 'P0004';
      end if;
      v_price := v_portion.price;
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

-- ---------------------------------------------------------------------------
create or replace function rpc_get_order_tracking(p_order_id uuid, p_access_token uuid)
returns table(
  order_id uuid, order_number int, status order_status, table_number int,
  restaurant_name text, subtotal numeric, tax numeric, service_charge numeric,
  discount numeric, total numeric, special_instructions text,
  estimated_ready_minutes int, created_at timestamptz,
  items jsonb
)
language sql security definer stable
set search_path = public
as $$
  select o.id, o.order_number, o.status, t.table_number, r.name,
         o.subtotal, o.tax, o.service_charge, o.discount, o.total,
         o.special_instructions, o.estimated_ready_minutes, o.created_at,
         (select coalesce(jsonb_agg(jsonb_build_object(
            'id', oi.id, 'name', oi.name_snapshot, 'portion', oi.portion_label_snapshot,
            'price', oi.price_snapshot, 'quantity', oi.quantity,
            'special_instructions', oi.special_instructions
          )), '[]'::jsonb) from order_items oi where oi.order_id = o.id)
  from orders o
  join restaurant_tables t on t.id = o.table_id
  join restaurants r on r.id = o.restaurant_id
  where o.id = p_order_id and o.access_token = p_access_token;
$$;

-- Broadcast order status changes to a capability-scoped channel so the
-- customer's phone gets true Supabase Realtime updates without needing
-- direct table access (the channel name embeds the unguessable access_token).
create or replace function broadcast_order_status() returns trigger as $$
begin
  begin
    perform realtime.broadcast_changes(
      'order:' || new.id::text || ':' || new.access_token::text,
      tg_op, tg_op, tg_table_name, tg_table_schema,
      new, old
    );
  exception when undefined_function or undefined_table then
    -- Realtime broadcast-from-database not available in this environment;
    -- the client's polling fallback (see useOrderTracker) still works.
    null;
  end;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_broadcast_order_status
  after update of status on orders
  for each row execute function broadcast_order_status();

-- ---------------------------------------------------------------------------
create or replace function rpc_create_request(p_qr_token uuid, p_type request_type)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_table_id uuid;
  v_request_id uuid;
begin
  select t.restaurant_id, t.id into v_restaurant_id, v_table_id
  from restaurant_tables t where t.qr_token = p_qr_token;

  if v_restaurant_id is null then
    raise exception 'invalid_table' using errcode = 'P0002';
  end if;

  insert into customer_requests (restaurant_id, table_id, type)
  values (v_restaurant_id, v_table_id, p_type)
  returning id into v_request_id;

  insert into notifications (restaurant_id, target_role, title, body, metadata)
  values (v_restaurant_id, 'staff', 'Table request',
    (select 'Table ' || table_number || ' needs: ' || p_type::text from restaurant_tables where id = v_table_id),
    jsonb_build_object('request_id', v_request_id, 'table_id', v_table_id));

  return v_request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff/chef status transitions — RLS on the base UPDATE policy already
-- restricts this to restaurant members, this RPC just stamps timestamps.
create or replace function rpc_update_order_status(p_order_id uuid, p_status order_status)
returns void
language plpgsql security invoker
set search_path = public
as $$
begin
  update orders set
    status = p_status,
    accepted_at = case when p_status = 'accepted' then now() else accepted_at end,
    preparing_at = case when p_status = 'preparing' then now() else preparing_at end,
    ready_at = case when p_status = 'ready' then now() else ready_at end,
    served_at = case when p_status = 'served' then now() else served_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end
  where id = p_order_id;

  if p_status = 'completed' then
    update restaurant_tables set status = 'cleaning'
    where id = (select table_id from orders where id = p_order_id);
  end if;
end;
$$;

create or replace function rpc_track_event(
  p_qr_token uuid, p_event_type text, p_menu_item_id uuid default null,
  p_metadata jsonb default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_table_id uuid;
begin
  select t.restaurant_id, t.id into v_restaurant_id, v_table_id
  from restaurant_tables t where t.qr_token = p_qr_token;

  if v_restaurant_id is null then
    return; -- analytics must never break the customer flow
  end if;

  insert into analytics_events (restaurant_id, event_type, table_id, menu_item_id, metadata)
  values (v_restaurant_id, p_event_type, v_table_id, p_menu_item_id, p_metadata);
end;
$$;

-- ---------------------------------------------------------------------------
-- Sandbox payment: clearly labeled, structured so a real gateway can slot in.
create or replace function rpc_record_sandbox_payment(
  p_order_id uuid, p_access_token uuid, p_method payment_method
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_total numeric;
  v_invoice_number text;
begin
  select total into v_total from orders where id = p_order_id and access_token = p_access_token;
  if v_total is null then
    raise exception 'invalid_order' using errcode = 'P0002';
  end if;

  -- Idempotent: a retried/duplicate submit for an already-paid order returns
  -- the existing payment instead of charging (and counting revenue) twice.
  select id into v_payment_id from payments where order_id = p_order_id and status = 'succeeded' limit 1;
  if v_payment_id is not null then
    return v_payment_id;
  end if;

  insert into payments (order_id, method, amount, status, is_sandbox, provider_ref)
  values (p_order_id, p_method, v_total, 'succeeded', true, 'SANDBOX-' || substr(gen_random_uuid()::text, 1, 8))
  returning id into v_payment_id;

  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((select order_number from orders where id = p_order_id)::text, 5, '0');

  insert into invoices (order_id, invoice_number, subtotal, tax, discount, service_charge, total)
  select id, v_invoice_number, subtotal, tax, discount, service_charge, total
  from orders where id = p_order_id
  on conflict do nothing;

  insert into analytics_events (restaurant_id, event_type, order_id)
  select restaurant_id, 'payment_completed', id from orders where id = p_order_id;

  update orders set status = 'completed', completed_at = now()
  where id = p_order_id and status in ('served', 'ready');

  update restaurant_tables set status = 'cleaning'
  where id = (select table_id from orders where id = p_order_id)
    and (select status from orders where id = p_order_id) = 'completed';

  return v_payment_id;
end;
$$;

create or replace function rpc_get_receipt(p_order_id uuid, p_access_token uuid)
returns table(
  invoice_number text, table_number int, restaurant_name text, restaurant_address text,
  subtotal numeric, tax numeric, discount numeric, service_charge numeric, total numeric,
  payment_method payment_method, is_sandbox boolean, created_at timestamptz, items jsonb
)
language sql security definer stable
set search_path = public
as $$
  select i.invoice_number, t.table_number, r.name, r.address,
         i.subtotal, i.tax, i.discount, i.service_charge, i.total,
         p.method, p.is_sandbox, i.created_at,
         (select coalesce(jsonb_agg(jsonb_build_object(
            'name', oi.name_snapshot, 'portion', oi.portion_label_snapshot,
            'price', oi.price_snapshot, 'quantity', oi.quantity
          )), '[]'::jsonb) from order_items oi where oi.order_id = o.id)
  from invoices i
  join orders o on o.id = i.order_id
  join restaurant_tables t on t.id = o.table_id
  join restaurants r on r.id = o.restaurant_id
  left join payments p on p.order_id = o.id and p.status = 'succeeded'
  where o.id = p_order_id and o.access_token = p_access_token;
$$;
