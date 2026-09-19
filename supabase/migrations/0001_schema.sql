-- ============================================================================
-- MANDI.COM — Restaurant OS — Core schema
-- Multi-tenant: every business row carries restaurant_id.
-- ============================================================================
create extension if not exists "pgcrypto";

create type user_role as enum ('customer', 'owner', 'manager', 'chef', 'staff', 'super_admin');
create type table_status as enum ('available','occupied','ordering','preparing','ready','serving','billing','cleaning');
create type order_status as enum ('placed','accepted','preparing','ready','served','completed','cancelled');
create type spice_level as enum ('none','mild','medium','hot','extra_hot');
create type request_type as enum ('water','extra_cutlery','call_waiter','clean_table','bill_please');
create type request_status as enum ('pending','acknowledged','resolved');
create type payment_method as enum ('upi','card','wallet','cash');
create type payment_status as enum ('pending','processing','succeeded','failed','refunded');
create type subscription_plan as enum ('starter','pro','enterprise');
create type subscription_status as enum ('trialing','active','past_due','cancelled');

-- ---------------------------------------------------------------------------
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  description text,
  logo_url text,
  hero_video_url text,
  hero_poster_url text,
  address text,
  phone text,
  opening_hours jsonb,
  primary_color text default '#C89B3C',
  is_demo boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);
create index idx_restaurant_members_user on restaurant_members(user_id);
create index idx_restaurant_members_restaurant on restaurant_members(restaurant_id);

create table restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_number int not null,
  qr_token uuid not null default gen_random_uuid(),
  status table_status not null default 'available',
  occupied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (restaurant_id, table_number),
  unique (qr_token)
);
create index idx_tables_restaurant on restaurant_tables(restaurant_id);

create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  url text not null,
  generated_at timestamptz not null default now(),
  unique (table_id)
);

-- ---------------------------------------------------------------------------
create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id, slug)
);
create index idx_categories_restaurant on menu_categories(restaurant_id);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  ingredients text[],
  base_price numeric(10,2), -- nullable: null means "price not yet set by owner", never guessed
  is_veg boolean not null default false,
  spice_level spice_level not null default 'medium',
  prep_time_minutes int,
  rating numeric(2,1),
  is_featured boolean not null default false,
  is_available boolean not null default true,
  serves_people int, -- for large packages like King Plate
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, slug)
);
create index idx_items_restaurant on menu_items(restaurant_id);
create index idx_items_category on menu_items(category_id);

create table menu_item_portions (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  label text not null, -- Small / Medium / Large / Extra Large / Full / Half
  price numeric(10,2), -- nullable = editable-by-owner, not guessed
  sort_order int not null default 0
);
create index idx_portions_item on menu_item_portions(menu_item_id);

create table menu_media (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  video_url text,
  video_url_webm text,
  poster_url text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  unique (menu_item_id)
);

-- ---------------------------------------------------------------------------
create sequence if not exists order_number_seq;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number int not null default nextval('order_number_seq'),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete restrict,
  status order_status not null default 'placed',
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  service_charge numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  special_instructions text,
  access_token uuid not null default gen_random_uuid(), -- capability token for anonymous customer tracking
  estimated_ready_minutes int,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_orders_restaurant on orders(restaurant_id, created_at desc);
create index idx_orders_table on orders(table_id);
create index idx_orders_status on orders(restaurant_id, status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete restrict,
  portion_id uuid references menu_item_portions(id) on delete restrict,
  name_snapshot text not null,
  portion_label_snapshot text,
  price_snapshot numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  special_instructions text,
  created_at timestamptz not null default now()
);
create index idx_order_items_order on order_items(order_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);
create index idx_status_history_order on order_status_history(order_id);

-- ---------------------------------------------------------------------------
create table customer_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  type request_type not null,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);
create index idx_requests_restaurant on customer_requests(restaurant_id, status);

-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  amount numeric(10,2) not null,
  status payment_status not null default 'pending',
  is_sandbox boolean not null default true,
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payments_order on payments(order_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  invoice_number text not null unique,
  subtotal numeric(10,2) not null,
  tax numeric(10,2) not null,
  discount numeric(10,2) not null,
  service_charge numeric(10,2) not null,
  total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  target_role user_role,
  title text not null,
  body text,
  metadata jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_restaurant on notifications(restaurant_id, is_read);

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  event_type text not null,
  table_id uuid references restaurant_tables(id) on delete set null,
  menu_item_id uuid references menu_items(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_analytics_restaurant_type on analytics_events(restaurant_id, event_type, created_at desc);
create index idx_analytics_item on analytics_events(menu_item_id, event_type);

create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  insight_type text not null,
  headline text not null,
  explanation text not null,
  data_snapshot jsonb not null,
  severity text not null default 'info',
  created_at timestamptz not null default now()
);
create index idx_ai_insights_restaurant on ai_insights(restaurant_id, created_at desc);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  plan subscription_plan not null default 'starter',
  status subscription_status not null default 'trialing',
  started_at timestamptz not null default now(),
  renews_at timestamptz,
  unique (restaurant_id)
);

-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

create trigger trg_payments_updated_at before update on payments
  for each row execute function set_updated_at();

create or replace function log_order_status_change() returns trigger as $$
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    insert into order_status_history(order_id, status, changed_by) values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_orders_status_history after insert or update of status on orders
  for each row execute function log_order_status_change();
