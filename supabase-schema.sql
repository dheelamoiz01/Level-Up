-- LEVEL UP — PostgreSQL Master Schema for Supabase
-- Run this script in the Supabase SQL Editor: https://supabase.com/dashboard/project/chracsjlsiynwflzznxa/sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. CLUB TABLES (5 Tables: 2 Royal, 2 Snooker, 1 Pool)
create table if not exists public.club_tables (
  id text primary key,
  number integer not null,
  name text not null,
  kind text not null check (kind in ('Royal', 'Snooker', 'Pool')),
  status text not null default 'available' check (status in ('available', 'playing', 'paused', 'maintenance')),
  hourly_rate numeric(10, 2) not null default 250.00,
  min_fee numeric(10, 2) not null default 50.00,
  current_player text,
  current_phone text,
  session_started_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed initial 5 tables if not present
insert into public.club_tables (id, number, name, kind, status, hourly_rate, min_fee)
values
  ('t-royal-1', 1, 'Royal Table 1', 'Royal', 'available', 500.00, 100.00),
  ('t-royal-2', 2, 'Royal Table 2', 'Royal', 'available', 500.00, 100.00),
  ('t-snooker-1', 3, 'Snooker Table 1', 'Snooker', 'available', 350.00, 70.00),
  ('t-snooker-2', 4, 'Snooker Table 2', 'Snooker', 'available', 350.00, 70.00),
  ('t-pool-1', 5, 'Pool Table 1', 'Pool', 'available', 250.00, 50.00)
on conflict (id) do update set
  name = excluded.name,
  kind = excluded.kind;

-- 2. PRODUCTS & FOOD ITEMS (F&B Menu with editable prices & stock)
create table if not exists public.products (
  id text primary key default concat('prod_', gen_random_uuid()),
  name text not null,
  category text not null check (category in ('Drinks', 'Snacks', 'Other')),
  price numeric(10, 2) not null default 0.00,
  cost_price numeric(10, 2) not null default 0.00,
  active boolean not null default true,
  stock_count integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed initial products
insert into public.products (id, name, category, price, cost_price, active)
values
  ('prod_redbull', 'Red Bull Energy Drink', 'Drinks', 160.00, 110.00, true),
  ('prod_water', 'Mineral Water (1L)', 'Drinks', 30.00, 12.00, true),
  ('prod_cold_coffee', 'Iced Cold Coffee', 'Drinks', 120.00, 45.00, true),
  ('prod_chips', 'Artisan Nachos & Dip', 'Snacks', 140.00, 50.00, true),
  ('prod_sandwich', 'Grilled Club Sandwich', 'Snacks', 180.00, 70.00, true),
  ('prod_peanuts', 'Salted Roasted Peanuts', 'Snacks', 60.00, 20.00, true)
on conflict (id) do nothing;

-- 3. SESSIONS
create table if not exists public.sessions (
  id text primary key default concat('sess_', gen_random_uuid()),
  table_id text references public.club_tables(id) on delete set null,
  table_name text not null,
  customer_name text not null default 'Walk-in Player',
  customer_phone text,
  hourly_rate numeric(10, 2) not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer default 0,
  table_amount numeric(10, 2) not null default 0.00,
  items_amount numeric(10, 2) not null default 0.00,
  discount_amount numeric(10, 2) not null default 0.00,
  discount_reason text,
  final_total numeric(10, 2) not null default 0.00,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'voided')),
  paid boolean not null default false,
  payment_method text check (payment_method in ('cash', 'upi', 'card', 'split', 'udhar')),
  created_by text default 'staff',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. SESSION ITEMS (Lines ordered during play)
create table if not exists public.session_items (
  id text primary key default concat('item_', gen_random_uuid()),
  session_id text references public.sessions(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null default 0.00,
  total_price numeric(10, 2) not null default 0.00,
  added_at timestamptz default now()
);

-- 5. AUDIT LOGS
create table if not exists public.audit_logs (
  id text primary key default concat('log_', gen_random_uuid()),
  action text not null,
  role text not null default 'staff',
  target_id text,
  details jsonb,
  created_at timestamptz default now()
);

-- Realtime publication for push notifications and instant tab sync
alter publication supabase_realtime add table public.club_tables;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.session_items;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.audit_logs;

-- Enable RLS
alter table public.club_tables enable row level security;
alter table public.products enable row level security;
alter table public.sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.audit_logs enable row level security;

-- Allow anon read/write for operational use (or authenticated staff)
create policy "Allow anon all on club_tables" on public.club_tables for all using (true) with check (true);
create policy "Allow anon all on products" on public.products for all using (true) with check (true);
create policy "Allow anon all on sessions" on public.sessions for all using (true) with check (true);
create policy "Allow anon all on session_items" on public.session_items for all using (true) with check (true);
create policy "Allow anon all on audit_logs" on public.audit_logs for all using (true) with check (true);
