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
  player: string;
  phone?: string;
  hourly_rate: number;
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
  payment_method?: "cash" | "upi" | "card" | "split" | "udhar";
  items?: SessionItem[];
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
