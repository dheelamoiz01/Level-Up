export type TableKind = "Royal" | "Snooker" | "Pool";
export type TableStatus = "available" | "playing" | "paused" | "maintenance";
export type UserRole = "staff" | "owner";

export interface ClubTable {
  id: string;
  number: number;
  name: string;
  kind: TableKind;
  status: TableStatus;
  hourly_rate: number;
  min_fee?: number;
  player?: string;
  phone?: string;
  session_started_at?: string;
  elapsed?: string;
  bill?: number;
  notes?: string;
  items_count?: number;
}

export interface TablePricing {
  id: string;
  category: TableKind;
  rate_30m: number;
  rate_60m: number;
  updated_by?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  category: "Drinks" | "Snacks" | "Other";
  price: number;
  cost_price?: number;
  active: boolean;
  stock_count?: number;
}

export interface SessionItem {
  id: string;
  session_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  added_at?: string;
}

export interface SessionRow {
  id: string;
  table_id: string;
  table: string;
  table_kind?: TableKind;
  player: string;
  phone?: string;
  hourly_rate: number;
  rate_snapshot?: number;
  started_at: string;
  ended_at?: string;
  duration: string;
  duration_minutes?: number;
  table_amount: number;
  items_amount: number;
  discount_amount: number;
  discount_reason?: string;
  amount: number;
  paid: boolean;
  payment_status?: "Unpaid" | "Partially Paid" | "Paid";
  payment_method?: "cash" | "upi" | "card" | "split" | "udhar";
  created_by?: string;
  items?: SessionItem[];
  status?: "active" | "paused" | "completed" | "voided";
}

export type ExpenseCategory =
  | "Staff Salaries"
  | "Table Maintenance & Repairs"
  | "Electricity Bill"
  | "Wi-Fi & Internet"
  | "Rent"
  | "Cleaning & Housekeeping"
  | "Equipment & Accessories"
  | "Water & Refreshments"
  | "Marketing"
  | "Other";

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  payment_method: "cash" | "upi" | "bank_transfer" | "card";
  paid_to: string;
  notes?: string;
  receipt_url?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessKPIs {
  todayCustomers: number;
  yesterdayCustomers: number;
  todayCollection: number;
  yesterdayCollection: number;
  cashCollection: number;
  digitalCollection: number;
  todayExpenses: number;
  yesterdayExpenses: number;
  netCollection: number;
  yesterdayNetCollection: number;
  totalRevenueBilled: number;
}

export interface CategoryTableUsage {
  kind: TableKind;
  sessionsToday: number;
  uniqueCustomers: number;
  totalBilled: number;
  amountCollected: number;
  totalOccupiedMinutes: number;
  tablesOccupied: number;
  totalTables: number;
}

export interface Metric {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
}

export interface FloorNotification {
  id: string;
  title: string;
  body: string;
  table_id?: string;
  table_name?: string;
  type: "session_start" | "session_pause" | "session_end" | "item_added" | "rate_changed" | "warning";
  timestamp: number;
  read: boolean;
}

export interface StaffStats {
  managerName: string;
  entriesToday: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  collectionsRecorded: number;
  outstandingPayments: number;
}
