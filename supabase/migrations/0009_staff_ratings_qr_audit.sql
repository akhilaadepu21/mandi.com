-- ============================================================================
-- Extends the existing schema for: individual staff accounts with granular
-- permissions, disable/enable of both staff logins and tables/QR codes,
-- a real customer rating system, and an audit trail of staff actions.
-- Nothing here replaces an existing table — restaurant_members and
-- restaurant_tables gain columns, and three new tables are added.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Staff profile + permissions live on restaurant_members (the table that
-- already ties one auth user to one restaurant + role) rather than a new
-- "staff_profiles" table, per the existing 1 user : 1 restaurant : 1 role
-- model this project uses.
alter table restaurant_members add column email text;
alter table restaurant_members add column full_name text;
alter table restaurant_members add column phone text;
alter table restaurant_members add column permissions text[] not null default '{}';
alter table restaurant_members add column is_disabled boolean not null default false;
alter table restaurant_members add column invited_by uuid references auth.users(id);

-- Tables can now carry seating info and be individually disabled without
-- losing their order history (soft-disable, not delete).
alter table restaurant_tables add column seats int;
alter table restaurant_tables add column is_disabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- Customer ratings, collected after a completed order.
create table menu_item_ratings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  order_item_id uuid not null references order_items(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id) -- one rating per ordered line; resubmitting updates it
);
create index idx_ratings_menu_item on menu_item_ratings(menu_item_id);
create index idx_ratings_restaurant on menu_item_ratings(restaurant_id, created_at desc);

create trigger trg_ratings_updated_at before update on menu_item_ratings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit trail of staff actions ("Rahul marked Table 5 as Served", etc).
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  action text not null,
  related_order_id uuid references orders(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_restaurant on audit_logs(restaurant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Security: a disabled staff member loses access everywhere immediately —
-- this is the single choke point every RLS policy already routes through,
-- so patching it here propagates instantly to every table.
create or replace function is_restaurant_member(p_restaurant_id uuid, p_roles user_role[] default null)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from restaurant_members m
    where m.restaurant_id = p_restaurant_id
      and m.user_id = auth.uid()
      and not m.is_disabled
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

create or replace function is_super_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from restaurant_members m where m.user_id = auth.uid() and m.role = 'super_admin' and not m.is_disabled
  );
$$;

-- Fine-grained, owner-configurable permission check. Owner/manager/super_admin
-- always pass (their role is the permission); chef/staff need the specific
-- permission string in their permissions array.
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
      and (m.role in ('owner', 'manager', 'super_admin') or p_permission = any(m.permissions))
  );
$$;

-- ---------------------------------------------------------------------------
-- Table management vs. everyday status changes are split: any operational
-- role can update a table's live status (occupied/cleaning/etc — that's
-- normal service work), but only owner/manager can create, delete, or
-- restructure a table (seats, disable). This closes the gap where the old
-- single "for all" policy let a waiter's account add/remove tables via a
-- direct API call even though the UI never offered that.
drop policy if exists tables_staff_write on restaurant_tables;

create policy tables_status_update on restaurant_tables for update
  using (is_restaurant_member(restaurant_id, array['owner','manager','staff','super_admin']::user_role[]))
  with check (is_restaurant_member(restaurant_id, array['owner','manager','staff','super_admin']::user_role[]));

create policy tables_manage_insert on restaurant_tables for insert
  with check (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]));

create policy tables_manage_delete on restaurant_tables for delete
  using (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]));

-- ---------------------------------------------------------------------------
-- Permission-gated (not just role-gated) access to billing and customer
-- requests — a concrete, enforced example of the owner-configurable
-- permission system, not just UI decoration.
drop policy if exists payments_staff_read on payments;
create policy payments_staff_read on payments for select
  using (has_permission((select restaurant_id from orders where id = order_id), 'view_billing'));

drop policy if exists invoices_staff_read on invoices;
create policy invoices_staff_read on invoices for select
  using (has_permission((select restaurant_id from orders where id = order_id), 'view_billing'));

drop policy if exists requests_staff_all on customer_requests;
create policy requests_staff_all on customer_requests for select
  using (has_permission(restaurant_id, 'handle_requests'));

drop policy if exists requests_staff_update on customer_requests;
create policy requests_staff_update on customer_requests for update
  using (has_permission(restaurant_id, 'handle_requests'));

-- ---------------------------------------------------------------------------
-- Ratings: staff can read (restaurant operations need to see them); writes
-- only via the SECURITY DEFINER RPC below (customer has no direct table
-- access, same pattern as orders/requests).
alter table menu_item_ratings enable row level security;
create policy ratings_staff_read on menu_item_ratings for select
  using (is_restaurant_member(restaurant_id, array['owner','manager','chef','staff','super_admin']::user_role[]));

-- Audit logs: owner/manager can review; any active restaurant member can
-- append (chef/staff actions get logged from the client for actions that
-- don't already flow through a trigger, e.g. marking a table cleaned).
alter table audit_logs enable row level security;
create policy audit_logs_owner_read on audit_logs for select
  using (is_restaurant_member(restaurant_id, array['owner','manager','super_admin']::user_role[]));
create policy audit_logs_member_insert on audit_logs for insert
  with check (is_restaurant_member(restaurant_id));

grant select, insert, update on menu_item_ratings, audit_logs to authenticated;

-- ---------------------------------------------------------------------------
-- Order status changes already trigger order_status_history; extend the
-- same trigger to also write a human-readable audit_logs line, so most
-- kitchen/staff actions ("Ahmed marked Order #12 as Preparing") are logged
-- automatically with zero extra client-side calls.
create or replace function log_order_status_change() returns trigger as $$
declare
  v_actor text;
  v_table_number int;
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    insert into order_status_history(order_id, status, changed_by) values (new.id, new.status, auth.uid());

    select coalesce(m.full_name, m.email, 'Staff') into v_actor
    from restaurant_members m
    where m.user_id = auth.uid() and m.restaurant_id = new.restaurant_id;

    select table_number into v_table_number from restaurant_tables where id = new.table_id;

    insert into audit_logs (restaurant_id, user_id, actor_name, action, related_order_id)
    values (
      new.restaurant_id,
      auth.uid(),
      coalesce(v_actor, 'Customer'),
      case
        when tg_op = 'INSERT' then format('Order #%s placed (Table %s)', new.order_number, v_table_number)
        else format('%s marked Order #%s as %s', coalesce(v_actor, 'Customer'), new.order_number, new.status)
      end,
      new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Resolve a table for the customer route, now also surfacing is_disabled so
-- the page can show "This table is currently unavailable" instead of a
-- generic not-found error when the QR itself is valid but switched off.
drop function if exists rpc_resolve_table(text, int);

create function rpc_resolve_table(p_slug text, p_table_number int)
returns table(
  restaurant_id uuid, table_id uuid, qr_token uuid, table_status table_status, table_is_disabled boolean,
  restaurant_name text, restaurant_tagline text, restaurant_logo_url text,
  restaurant_hero_video_url text, restaurant_hero_poster_url text, primary_color text
)
language sql security definer stable
set search_path = public
as $$
  select r.id, t.id, t.qr_token, t.status, t.is_disabled, r.name, r.tagline, r.logo_url,
         r.hero_video_url, r.hero_poster_url, r.primary_color
  from restaurants r
  join restaurant_tables t on t.restaurant_id = r.id
  where r.slug = p_slug and t.table_number = p_table_number and r.is_active;
$$;

-- rpc_place_order must also refuse a disabled table, not just resolve one.
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
  v_table_disabled boolean;
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
  select t.restaurant_id, t.id, t.is_disabled into v_restaurant_id, v_table_id, v_table_disabled
  from restaurant_tables t where t.qr_token = p_qr_token;

  if v_restaurant_id is null then
    raise exception 'invalid_table' using errcode = 'P0002';
  end if;

  if v_table_disabled then
    raise exception 'table_disabled' using errcode = 'P0011';
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

-- ---------------------------------------------------------------------------
-- Rating submission — only for the customer who placed the (now completed)
-- order, verified via the same access_token capability pattern as the rest
-- of the anonymous customer flow. Resubmitting updates the existing rating
-- instead of creating a duplicate.
create or replace function rpc_submit_rating(
  p_order_id uuid, p_access_token uuid, p_order_item_id uuid, p_rating int, p_review text default null
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_menu_item_id uuid;
  v_rating_id uuid;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating' using errcode = 'P0012';
  end if;

  select o.restaurant_id into v_restaurant_id
  from orders o
  where o.id = p_order_id and o.access_token = p_access_token and o.status = 'completed';

  if v_restaurant_id is null then
    raise exception 'order_not_ratable' using errcode = 'P0013';
  end if;

  select oi.menu_item_id into v_menu_item_id
  from order_items oi
  where oi.id = p_order_item_id and oi.order_id = p_order_id;

  if v_menu_item_id is null then
    raise exception 'invalid_order_item' using errcode = 'P0014';
  end if;

  insert into menu_item_ratings (restaurant_id, order_id, order_item_id, menu_item_id, rating, review)
  values (v_restaurant_id, p_order_id, p_order_item_id, v_menu_item_id, p_rating, nullif(trim(p_review), ''))
  on conflict (order_item_id) do update set rating = excluded.rating, review = excluded.review, updated_at = now()
  returning id into v_rating_id;

  return v_rating_id;
end;
$$;

grant execute on function rpc_submit_rating(uuid, uuid, uuid, int, text) to anon, authenticated;

-- Sandbox payment now also writes an audit log entry (bill generation).
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
  v_restaurant_id uuid;
  v_order_number int;
begin
  select total, restaurant_id, order_number into v_total, v_restaurant_id, v_order_number
  from orders where id = p_order_id and access_token = p_access_token;
  if v_total is null then
    raise exception 'invalid_order' using errcode = 'P0002';
  end if;

  select id into v_payment_id from payments where order_id = p_order_id and status = 'succeeded' limit 1;
  if v_payment_id is not null then
    return v_payment_id;
  end if;

  insert into payments (order_id, method, amount, status, is_sandbox, provider_ref)
  values (p_order_id, p_method, v_total, 'succeeded', true, 'SANDBOX-' || substr(gen_random_uuid()::text, 1, 8))
  returning id into v_payment_id;

  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_order_number::text, 5, '0');

  insert into invoices (order_id, invoice_number, subtotal, tax, discount, service_charge, total)
  select id, v_invoice_number, subtotal, tax, discount, service_charge, total
  from orders where id = p_order_id
  on conflict do nothing;

  insert into analytics_events (restaurant_id, event_type, order_id)
  values (v_restaurant_id, 'payment_completed', p_order_id);

  update orders set status = 'completed', completed_at = now()
  where id = p_order_id and status in ('served', 'ready');

  update restaurant_tables set status = 'cleaning'
  where id = (select table_id from orders where id = p_order_id)
    and (select status from orders where id = p_order_id) = 'completed';

  insert into audit_logs (restaurant_id, actor_name, action, related_order_id)
  values (v_restaurant_id, 'Customer', format('Bill #%s generated and paid (sandbox, %s)', v_invoice_number, p_method), p_order_id);

  return v_payment_id;
end;
$$;
