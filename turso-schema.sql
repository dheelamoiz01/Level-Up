-- LEVEL UP — Turso libSQL Master Schema
-- Run via: node scripts/migrate-turso.js

CREATE TABLE IF NOT EXISTS club_tables (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('Royal', 'Snooker', 'Pool')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'playing', 'paused', 'maintenance')),
  hourly_rate REAL NOT NULL DEFAULT 250.00,
  min_fee REAL NOT NULL DEFAULT 50.00,
  current_player TEXT,
  current_phone TEXT,
  session_started_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS table_pricing (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL UNIQUE CHECK (category IN ('Royal', 'Snooker', 'Pool')),
  rate_30m REAL NOT NULL,
  rate_60m REAL NOT NULL,
  updated_by TEXT DEFAULT 'owner',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Drinks', 'Snacks', 'Other')),
  price REAL NOT NULL DEFAULT 0.00,
  cost_price REAL NOT NULL DEFAULT 0.00,
  active INTEGER NOT NULL DEFAULT 1,
  stock_count INTEGER DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  table_id TEXT,
  table_name TEXT NOT NULL,
  table_kind TEXT DEFAULT 'Snooker',
  customer_name TEXT NOT NULL DEFAULT 'Walk-in Player',
  customer_phone TEXT,
  hourly_rate REAL NOT NULL,
  rate_snapshot REAL DEFAULT 350.0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  duration_minutes INTEGER DEFAULT 0,
  table_amount REAL NOT NULL DEFAULT 0.00,
  items_amount REAL NOT NULL DEFAULT 0.00,
  discount_amount REAL NOT NULL DEFAULT 0.00,
  discount_reason TEXT,
  final_total REAL NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'voided')),
  paid INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'split', 'udhar')),
  created_by TEXT DEFAULT 'staff',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_items (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0.00,
  total_price REAL NOT NULL DEFAULT 0.00,
  added_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card')),
  paid_to TEXT NOT NULL,
  notes TEXT,
  receipt_url TEXT,
  created_by TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  target_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_table_id ON sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
