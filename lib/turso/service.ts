import { getTursoClient } from "./client";
import type {
  ClubTable,
  Product,
  SessionRow,
  Expense,
  TablePricing,
  BusinessKPIs,
  CategoryTableUsage,
  TableKind,
  SessionItem,
} from "@/lib/types";

const DEFAULT_CLUB_TABLES: ClubTable[] = [
  { id: "t-royal-1", number: 1, name: "Royal Table 1", kind: "Royal", status: "available", hourly_rate: 500, min_fee: 100 },
  { id: "t-royal-2", number: 2, name: "Royal Table 2", kind: "Royal", status: "available", hourly_rate: 500, min_fee: 100 },
  { id: "t-snooker-1", number: 3, name: "Snooker Table 1", kind: "Snooker", status: "available", hourly_rate: 350, min_fee: 70 },
  { id: "t-snooker-2", number: 4, name: "Snooker Table 2", kind: "Snooker", status: "available", hourly_rate: 350, min_fee: 70 },
  { id: "t-pool-1", number: 5, name: "Pool Table 1", kind: "Pool", status: "available", hourly_rate: 250, min_fee: 50 },
];


/** Formats remaining seconds into MM:SS or HH:MM */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM.toString().padStart(2, "0")}m`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Formats elapsed seconds into HH:MM:SS */
export function formatDurationFromStart(startIso?: string | null): string {
  if (!startIso) return "00:00:00";
  const start = new Date(startIso).getTime();
  if (isNaN(start)) return "00:00:00";
  const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Calculates accrued table bill based on elapsed time and hourly rate */
export function calculateAccruedBill(
  startIso?: string | null,
  hourlyRate: number = 350,
  minFee: number = 50
): number {
  if (!startIso) return 0;
  const start = new Date(startIso).getTime();
  if (isNaN(start)) return 0;
  const hours = Math.max(0, (Date.now() - start) / (1000 * 60 * 60));
  const accrued = Math.round(hours * hourlyRate);
  return Math.max(minFee, accrued);
}

/** Gets today's and yesterday's date string YYYY-MM-DD in local time */
function getLocalDateStrings() {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const yDate = new Date(now);
  yDate.setDate(yDate.getDate() - 1);
  const yesterday = yDate.toLocaleDateString("en-CA");
  return { today, yesterday };
}

/** 1. Fetch real club tables from Turso with live timer & session merge */
export async function getLiveTables(): Promise<ClubTable[]> {
  try {
    const client = getTursoClient();
    const result = await client.execute("SELECT * FROM club_tables ORDER BY number ASC");

    if (!result.rows || result.rows.length === 0) {
      return DEFAULT_CLUB_TABLES;
    }

    // Query active sessions to link live match data
    const activeSessionsRes = await client.execute("SELECT * FROM sessions WHERE status = 'active'");
    const activeMap = new Map<string, any>();
    for (const s of activeSessionsRes.rows as any[]) {
      if (s.table_id) activeMap.set(String(s.table_id), s);
    }

    return result.rows.map((row: any) => {
      const isPlaying = row.status === "playing";
      const activeSess = activeMap.get(String(row.id));

      const startIso = row.session_started_at || (activeSess ? activeSess.started_at : null);
      const scheduledEndIso = row.scheduled_end_at || (activeSess ? activeSess.scheduled_end_at : null);

      let remainingSec = 0;
      let isTimeUp = false;

      if (isPlaying && scheduledEndIso) {
        remainingSec = Math.floor((new Date(scheduledEndIso).getTime() - Date.now()) / 1000);
        isTimeUp = remainingSec <= 0;
      }

      let bill = 0;
      if (isPlaying) {
        if (activeSess) {
          bill = Number(activeSess.final_total || activeSess.table_amount || 0);
        } else if (startIso) {
          bill = calculateAccruedBill(String(startIso), Number(row.hourly_rate), Number(row.min_fee || 50));
        }
      }

      return {
        id: String(row.id),
        number: Number(row.number),
        name: String(row.name),
        kind: row.kind as ClubTable["kind"],
        status: row.status as ClubTable["status"],
        hourly_rate: Number(row.hourly_rate),
        min_fee: Number(row.min_fee || 50),
        player: row.current_player ? String(row.current_player) : (activeSess ? String(activeSess.customer_name) : undefined),
        phone: (() => {
          const p = row.current_phone || (activeSess ? activeSess.customer_phone : null);
          if (!p || String(p) === "null" || String(p).trim() === "") return undefined;
          return String(p).trim();
        })(),
        session_started_at: startIso ? String(startIso) : undefined,
        scheduled_end_at: scheduledEndIso ? String(scheduledEndIso) : undefined,
        duration_choice: (row.duration_choice || (activeSess ? activeSess.duration_choice : "30m")) as "30m" | "1h",
        current_session_id: row.current_session_id ? String(row.current_session_id) : (activeSess ? String(activeSess.id) : undefined),
        elapsed: isPlaying && startIso ? formatDurationFromStart(String(startIso)) : undefined,
        bill,
        notes: row.notes ? String(row.notes) : undefined,
        remaining_seconds: remainingSec,
        is_time_up: isTimeUp,
      };
    });
  } catch (err) {
    console.debug("Error fetching tables from Turso, falling back to clean fleet:", err);
    return DEFAULT_CLUB_TABLES;
  }
}

/** 2. Fetch real products / menu from Turso */
export async function getLiveProducts(): Promise<Product[]> {
  try {
    const client = getTursoClient();
    const result = await client.execute("SELECT * FROM products ORDER BY name ASC");

    if (!result.rows || result.rows.length === 0) {
      return [];
    }

    return result.rows.map((p: any) => ({
      id: String(p.id),
      name: String(p.name),
      category: p.category as Product["category"],
      price: Number(p.price),
      cost_price: Number(p.cost_price || Math.round(Number(p.price) * 0.6)),
      active: Boolean(p.active),
      stock_count: Number(p.stock_count ?? 100),
    }));
  } catch (err) {
    console.debug("Error fetching products from Turso:", err);
    return [];
  }
}

/** 3. Fetch real sessions ledger from Turso */
export async function getLiveSessions(limit: number = 50): Promise<SessionRow[]> {
  try {
    const client = getTursoClient();
    const result = await client.execute({
      sql: "SELECT * FROM sessions WHERE status != 'voided' ORDER BY started_at DESC LIMIT ?",
      args: [limit],
    });

    if (!result.rows || result.rows.length === 0) {
      return [];
    }

    return result.rows.map((s: any) => {
      const start = new Date(String(s.started_at));
      const end = s.ended_at ? new Date(String(s.ended_at)) : new Date();
      const diffMins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      return {
        id: String(s.id),
        table_id: String(s.table_id || "table"),
        table: String(s.table_name || "Arena Table"),
        table_kind: (s.table_kind as TableKind) || "Snooker",
        player: String(s.customer_name || "Walk-in Player"),
        phone: s.customer_phone && String(s.customer_phone) !== "null" ? String(s.customer_phone) : undefined,
        hourly_rate: Number(s.hourly_rate),
        rate_snapshot: Number(s.rate_snapshot || s.hourly_rate),
        started_at: String(s.started_at),
        ended_at: s.ended_at ? String(s.ended_at) : undefined,
        duration: durationStr,
        duration_minutes: diffMins,
        table_amount: Number(s.table_amount || 0),
        items_amount: Number(s.items_amount || 0),
        discount_amount: Number(s.discount_amount || 0),
        discount_reason: s.discount_reason ? String(s.discount_reason) : undefined,
        amount: Number(s.final_total || 0),
        paid: Boolean(s.paid),
        payment_status: (s.payment_status as SessionRow["payment_status"]) || (s.paid ? "Paid" : "Unpaid"),
        payment_method: s.payment_method || "cash",
        created_by: String(s.created_by || "manager"),
        status: (s.status as SessionRow["status"]) || "active",
        cash_paid: s.cash_paid != null ? Number(s.cash_paid) : undefined,
        upi_paid: s.upi_paid != null ? Number(s.upi_paid) : undefined,
        udhar_amount: s.udhar_amount != null ? Number(s.udhar_amount) : undefined,
        upi_reference: s.upi_reference ? String(s.upi_reference) : undefined,
      };
    });
  } catch (err) {
    console.debug("Error fetching sessions from Turso:", err);
    return [];
  }
}

/** 4. Business Overview KPIs (calculated from real database records) */
export async function getBusinessKPIs(): Promise<BusinessKPIs> {
  const { today, yesterday } = getLocalDateStrings();
  try {
    const client = getTursoClient();

    // Query today's & yesterday's sessions
    const sessionsRes = await client.execute({
      sql: `SELECT customer_name, customer_phone, started_at, final_total, table_amount, items_amount, 
                   paid, payment_status, payment_method, cash_paid, upi_paid, udhar_amount, status 
            FROM sessions 
            WHERE date(started_at) >= ?`,
      args: [yesterday],
    });

    // Query today's & yesterday's expenses
    const expensesRes = await client.execute({
      sql: `SELECT amount, expense_date FROM expenses WHERE expense_date >= ?`,
      args: [yesterday],
    });

    const todayCustomersSet = new Set<string>();
    const yesterdayCustomersSet = new Set<string>();

    let todayCollection = 0;
    let yesterdayCollection = 0;
    let cashCollection = 0;
    let digitalCollection = 0;
    let totalRevenueBilled = 0;

    for (const row of sessionsRes.rows as any[]) {
      if (row.status === "voided") continue;
      const dateStr = String(row.started_at).slice(0, 10);
      const custIdentifier = (row.customer_phone || row.customer_name || "").toLowerCase().trim();
      const amount = Number(row.final_total || 0);
      const isPaid = Boolean(row.paid) || row.payment_status === "Paid";
      const cash = Number(row.cash_paid || (isPaid && row.payment_method === "cash" ? amount : 0));
      const upi = Number(row.upi_paid || (isPaid && row.payment_method === "upi" ? amount : 0));
      const collected = cash + upi;

      if (dateStr === today) {
        if (custIdentifier) todayCustomersSet.add(custIdentifier);
        totalRevenueBilled += amount;
        todayCollection += collected > 0 ? collected : (isPaid ? amount : 0);
        cashCollection += cash;
        digitalCollection += upi;
      } else if (dateStr === yesterday) {
        if (custIdentifier) yesterdayCustomersSet.add(custIdentifier);
        yesterdayCollection += collected > 0 ? collected : (isPaid ? amount : 0);
      }
    }

    let todayExpenses = 0;
    let yesterdayExpenses = 0;

    for (const row of expensesRes.rows as any[]) {
      const expDate = String(row.expense_date).slice(0, 10);
      const amt = Number(row.amount || 0);
      if (expDate === today) {
        todayExpenses += amt;
      } else if (expDate === yesterday) {
        yesterdayExpenses += amt;
      }
    }

    return {
      todayCustomers: todayCustomersSet.size,
      yesterdayCustomers: yesterdayCustomersSet.size,
      todayCollection,
      yesterdayCollection,
      cashCollection,
      digitalCollection,
      todayExpenses,
      yesterdayExpenses,
      netCollection: todayCollection - todayExpenses,
      yesterdayNetCollection: yesterdayCollection - yesterdayExpenses,
      totalRevenueBilled,
    };
  } catch (err) {
    console.debug("Error computing KPIs from Turso:", err);
    return {
      todayCustomers: 0,
      yesterdayCustomers: 0,
      todayCollection: 0,
      yesterdayCollection: 0,
      cashCollection: 0,
      digitalCollection: 0,
      todayExpenses: 0,
      yesterdayExpenses: 0,
      netCollection: 0,
      yesterdayNetCollection: 0,
      totalRevenueBilled: 0,
    };
  }
}

/** 5. Today's Table Activity by Category (Royal, Snooker, Pool) */
export async function getCategoryTableUsageToday(): Promise<Record<TableKind, CategoryTableUsage>> {
  const { today } = getLocalDateStrings();
  const baseMap: Record<TableKind, CategoryTableUsage> = {
    Royal: {
      kind: "Royal",
      sessionsToday: 0,
      uniqueCustomers: 0,
      totalBilled: 0,
      amountCollected: 0,
      totalOccupiedMinutes: 0,
      tablesOccupied: 0,
      totalTables: 2,
    },
    Snooker: {
      kind: "Snooker",
      sessionsToday: 0,
      uniqueCustomers: 0,
      totalBilled: 0,
      amountCollected: 0,
      totalOccupiedMinutes: 0,
      tablesOccupied: 0,
      totalTables: 2,
    },
    Pool: {
      kind: "Pool",
      sessionsToday: 0,
      uniqueCustomers: 0,
      totalBilled: 0,
      amountCollected: 0,
      totalOccupiedMinutes: 0,
      tablesOccupied: 0,
      totalTables: 1,
    },
  };

  try {
    const client = getTursoClient();

    // Query current club_tables status
    const tablesRes = await client.execute("SELECT kind, status FROM club_tables");
    for (const t of tablesRes.rows as any[]) {
      const kind = t.kind as TableKind;
      if (baseMap[kind] && t.status === "playing") {
        baseMap[kind].tablesOccupied += 1;
      }
    }

    // Query today's sessions (excluding voided)
    const sessionsRes = await client.execute({
      sql: `SELECT table_kind, customer_name, customer_phone, final_total, paid, duration_minutes 
            FROM sessions 
            WHERE date(started_at) = ? AND status != 'voided'`,
      args: [today],
    });

    const custSets: Record<TableKind, Set<string>> = {
      Royal: new Set(),
      Snooker: new Set(),
      Pool: new Set(),
    };

    for (const s of sessionsRes.rows as any[]) {
      const kind = (s.table_kind as TableKind) || "Snooker";
      if (!baseMap[kind]) continue;

      baseMap[kind].sessionsToday += 1;
      const cust = (s.customer_phone || s.customer_name || "").toLowerCase().trim();
      if (cust) custSets[kind].add(cust);

      const billed = Number(s.final_total || 0);
      baseMap[kind].totalBilled += billed;
      if (s.paid) {
        baseMap[kind].amountCollected += billed;
      }
      baseMap[kind].totalOccupiedMinutes += Number(s.duration_minutes || 0);
    }

    baseMap.Royal.uniqueCustomers = custSets.Royal.size;
    baseMap.Snooker.uniqueCustomers = custSets.Snooker.size;
    baseMap.Pool.uniqueCustomers = custSets.Pool.size;

    return baseMap;
  } catch (err) {
    console.debug("Error computing table usage by category:", err);
    return baseMap;
  }
}

/** 6. Table Pricing Management (Owner Configurable) */
export async function getTablePricing(): Promise<TablePricing[]> {
  try {
    const client = getTursoClient();
    const res = await client.execute("SELECT * FROM table_pricing ORDER BY category ASC");
    if (!res.rows || res.rows.length === 0) {
      return [
        { id: "price_royal", category: "Royal", rate_30m: 300, rate_60m: 500 },
        { id: "price_snooker", category: "Snooker", rate_30m: 200, rate_60m: 350 },
        { id: "price_pool", category: "Pool", rate_30m: 150, rate_60m: 250 },
      ];
    }
    return res.rows.map((r: any) => ({
      id: String(r.id),
      category: r.category as TableKind,
      rate_30m: Number(r.rate_30m),
      rate_60m: Number(r.rate_60m),
      updated_by: r.updated_by ? String(r.updated_by) : "owner",
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    }));
  } catch (err) {
    console.debug("Error loading table pricing:", err);
    return [];
  }
}

export async function updateTablePricing(
  category: TableKind,
  rate_30m: number,
  rate_60m: number,
  updatedBy: string = "manager",
  userRole: string = "staff"
) {
  // Validate authorized roles (manager or owner)
  if (userRole !== "owner" && userRole !== "staff") {
    return false;
  }

  try {
    const client = getTursoClient();
    await client.execute({
      sql: `INSERT INTO table_pricing (id, category, rate_30m, rate_60m, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT (category) DO UPDATE SET
              rate_30m = excluded.rate_30m,
              rate_60m = excluded.rate_60m,
              updated_by = excluded.updated_by,
              updated_at = datetime('now')`,
      args: [`price_${category.toLowerCase()}`, category, rate_30m, rate_60m, updatedBy],
    });

    // Also update current active tables default hourly rate
    await client.execute({
      sql: `UPDATE club_tables SET hourly_rate = ?, updated_at = datetime('now') WHERE kind = ?`,
      args: [rate_60m, category],
    });

    // Log to audit trail
    await client.execute({
      sql: `INSERT INTO audit_logs (id, action, role, details) VALUES (?, ?, ?, ?)`,
      args: [
        `audit_${Date.now()}`,
        "UPDATE_PRICING",
        userRole,
        JSON.stringify({ category, rate_30m, rate_60m, updatedBy, userRole }),
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({ type: "floor_update", action: "update_pricing" });
        bc.close();
      } catch (e) {}
    }
    return true;
  } catch (err) {
    console.error("Failed to update table pricing:", err);
    return false;
  }
}

/** 6b. Batch Save Table Pricing for All Categories (Owner & Manager Authorized) */
export async function saveAllTablePricing(
  rates: { category: TableKind; rate_30m: number; rate_60m: number }[],
  updatedBy: string = "manager",
  userRole: string = "staff"
): Promise<{ success: boolean; error?: string }> {
  // Validate authorized roles on server
  if (userRole !== "owner" && userRole !== "staff") {
    return { success: false, error: "Unauthorized: Only managers and owners are permitted to update table rates." };
  }

  // Validate non-negative numbers
  for (const r of rates) {
    if (isNaN(r.rate_30m) || r.rate_30m < 0 || isNaN(r.rate_60m) || r.rate_60m < 0) {
      return {
        success: false,
        error: `Invalid tariff entered for ${r.category} table. All prices must be non-negative numeric amounts.`,
      };
    }
  }

  try {
    const client = getTursoClient();

    for (const r of rates) {
      await client.execute({
        sql: `INSERT INTO table_pricing (id, category, rate_30m, rate_60m, updated_by, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT (category) DO UPDATE SET
                rate_30m = excluded.rate_30m,
                rate_60m = excluded.rate_60m,
                updated_by = excluded.updated_by,
                updated_at = datetime('now')`,
        args: [`price_${r.category.toLowerCase()}`, r.category, r.rate_30m, r.rate_60m, updatedBy],
      });

      // Update club_tables fleet baseline hourly rate for that category
      await client.execute({
        sql: `UPDATE club_tables SET hourly_rate = ?, updated_at = datetime('now') WHERE kind = ?`,
        args: [r.rate_60m, r.category],
      });
    }

    // Record audit trail
    await client.execute({
      sql: `INSERT INTO audit_logs (id, action, role, details) VALUES (?, ?, ?, ?)`,
      args: [
        `audit_${Date.now()}`,
        "UPDATE_ALL_PRICING",
        userRole,
        JSON.stringify({ rates, updatedBy, userRole, timestamp: new Date().toISOString() }),
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({ type: "floor_update", action: "update_pricing" });
        bc.close();
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to save all table pricing:", err);
    return { success: false, error: String(err) };
  }
}

/** 7. Expense Management */
export async function getExpenses(filterCategory?: string, dateFrom?: string, dateTo?: string): Promise<Expense[]> {
  try {
    const client = getTursoClient();
    let query = "SELECT * FROM expenses WHERE 1=1";
    const args: any[] = [];

    if (filterCategory && filterCategory !== "All") {
      query += " AND category = ?";
      args.push(filterCategory);
    }
    if (dateFrom) {
      query += " AND expense_date >= ?";
      args.push(dateFrom);
    }
    if (dateTo) {
      query += " AND expense_date <= ?";
      args.push(dateTo);
    }

    query += " ORDER BY expense_date DESC, created_at DESC LIMIT 100";

    const res = await client.execute({ sql: query, args });
    return res.rows.map((r: any) => ({
      id: String(r.id),
      title: String(r.title),
      category: r.category as Expense["category"],
      amount: Number(r.amount),
      expense_date: String(r.expense_date),
      payment_method: r.payment_method as Expense["payment_method"],
      paid_to: String(r.paid_to),
      notes: r.notes ? String(r.notes) : undefined,
      receipt_url: r.receipt_url ? String(r.receipt_url) : undefined,
      created_by: String(r.created_by || "owner"),
      created_at: String(r.created_at),
    }));
  } catch (err) {
    console.debug("Error fetching expenses:", err);
    return [];
  }
}

export async function insertExpense(expense: Omit<Expense, "id" | "created_at" | "updated_at">) {
  try {
    const client = getTursoClient();
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await client.execute({
      sql: `INSERT INTO expenses (id, title, category, amount, expense_date, payment_method, paid_to, notes, receipt_url, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        expense.title,
        expense.category,
        expense.amount,
        expense.expense_date,
        expense.payment_method,
        expense.paid_to,
        expense.notes || null,
        expense.receipt_url || null,
        expense.created_by,
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return { success: true, id };
  } catch (err) {
    console.error("Failed to insert expense:", err);
    return { success: false, error: String(err) };
  }
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  try {
    const client = getTursoClient();
    const sets: string[] = ["updated_at = datetime('now')"];
    const args: any[] = [];

    if (updates.title !== undefined) {
      sets.push("title = ?");
      args.push(updates.title);
    }
    if (updates.category !== undefined) {
      sets.push("category = ?");
      args.push(updates.category);
    }
    if (updates.amount !== undefined) {
      sets.push("amount = ?");
      args.push(updates.amount);
    }
    if (updates.expense_date !== undefined) {
      sets.push("expense_date = ?");
      args.push(updates.expense_date);
    }
    if (updates.payment_method !== undefined) {
      sets.push("payment_method = ?");
      args.push(updates.payment_method);
    }
    if (updates.paid_to !== undefined) {
      sets.push("paid_to = ?");
      args.push(updates.paid_to);
    }
    if (updates.notes !== undefined) {
      sets.push("notes = ?");
      args.push(updates.notes);
    }

    args.push(id);
    await client.execute({
      sql: `UPDATE expenses SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to update expense:", err);
    return false;
  }
}

export async function deleteExpense(id: string) {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: "DELETE FROM expenses WHERE id = ?",
      args: [id],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to delete expense:", err);
    return false;
  }
}

/** 8. Manager & Staff Accountability */
export interface StaffStats {
  managerName: string;
  entriesToday: number;
  sessionsStarted: number;
  sessionsCompleted: number;
  collectionsRecorded: number;
  outstandingPayments: number;
}

export async function getStaffAccountability(): Promise<StaffStats[]> {
  const { today } = getLocalDateStrings();
  try {
    const client = getTursoClient();
    const res = await client.execute({
      sql: `SELECT created_by, status, paid, final_total 
            FROM sessions 
            WHERE date(started_at) = ? AND status != 'voided'`,
      args: [today],
    });

    const map = new Map<string, StaffStats>();

    // Seed default manager
    map.set("manager", {
      managerName: "manager",
      entriesToday: 0,
      sessionsStarted: 0,
      sessionsCompleted: 0,
      collectionsRecorded: 0,
      outstandingPayments: 0,
    });

    for (const r of res.rows as any[]) {
      const name = String(r.created_by || "manager");
      if (!map.has(name)) {
        map.set(name, {
          managerName: name,
          entriesToday: 0,
          sessionsStarted: 0,
          sessionsCompleted: 0,
          collectionsRecorded: 0,
          outstandingPayments: 0,
        });
      }
      const item = map.get(name)!;
      item.entriesToday += 1;
      if (r.status === "active") item.sessionsStarted += 1;
      if (r.status === "completed") item.sessionsCompleted += 1;
      const amt = Number(r.final_total || 0);
      if (r.paid) {
        item.collectionsRecorded += amt;
      } else {
        item.outstandingPayments += amt;
      }
    }

    return Array.from(map.values());
  } catch (err) {
    console.debug("Error computing staff stats:", err);
    return [
      {
        managerName: "manager",
        entriesToday: 0,
        sessionsStarted: 0,
        sessionsCompleted: 0,
        collectionsRecorded: 0,
        outstandingPayments: 0,
      },
    ];
  }
}

/** 9. Update single table hourly rate in Turso */
export async function updateTableRate(id: string, rate: number) {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: "UPDATE club_tables SET hourly_rate = ?, updated_at = datetime('now') WHERE id = ?",
      args: [rate, id],
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to update table rate in Turso:", err);
    return false;
  }
}

/** 10. Bulk update hourly rates by kind in Turso */
export async function updateBulkTableRates(kind: string, rate: number) {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: "UPDATE club_tables SET hourly_rate = ?, updated_at = datetime('now') WHERE kind = ?",
      args: [rate, kind],
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to update bulk rates in Turso:", err);
    return false;
  }
}

/** 11. Insert new product into Turso */
export async function insertProduct(product: {
  id?: string;
  name: string;
  category: string;
  price: number;
  cost_price?: number;
  active?: boolean;
  stock_count?: number;
}) {
  try {
    const client = getTursoClient();
    const id = product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await client.execute({
      sql: `INSERT INTO products (id, name, category, price, cost_price, active, stock_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        product.name,
        product.category,
        product.price,
        product.cost_price ?? Math.round(product.price * 0.6),
        product.active ? 1 : 0,
        product.stock_count ?? 100,
      ],
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to insert product in Turso:", err);
    return false;
  }
}

/** 12. Update product in Turso */
export async function updateProduct(id: string, updates: Partial<Product>) {
  try {
    const client = getTursoClient();
    const sets: string[] = ["updated_at = datetime('now')"];
    const args: any[] = [];

    if (updates.name !== undefined) {
      sets.push("name = ?");
      args.push(updates.name);
    }
    if (updates.category !== undefined) {
      sets.push("category = ?");
      args.push(updates.category);
    }
    if (updates.price !== undefined) {
      sets.push("price = ?");
      args.push(updates.price);
    }
    if (updates.cost_price !== undefined) {
      sets.push("cost_price = ?");
      args.push(updates.cost_price);
    }
    if (updates.active !== undefined) {
      sets.push("active = ?");
      args.push(updates.active ? 1 : 0);
    }
    if (updates.stock_count !== undefined) {
      sets.push("stock_count = ?");
      args.push(updates.stock_count);
    }

    args.push(id);
    await client.execute({
      sql: `UPDATE products SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to update product in Turso:", err);
    return false;
  }
}

/** 13. Delete product from Turso */
export async function deleteProduct(id: string) {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: "DELETE FROM products WHERE id = ?",
      args: [id],
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to delete product in Turso:", err);
    return false;
  }
}

/** 14. Start Arena Session in Turso */
export async function startArenaSession(params: {
  tableId: string;
  tableName: string;
  tableKind?: TableKind;
  player: string;
  phone?: string;
  notes?: string;
  hourlyRate: number;
  startedAtIso: string;
  createdBy?: string;
}) {
  try {
    const client = getTursoClient();
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Update club table status
    await client.execute({
      sql: `UPDATE club_tables 
            SET status = 'playing', current_player = ?, current_phone = ?, session_started_at = ?, notes = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [params.player, params.phone || null, params.startedAtIso, params.notes || null, params.tableId],
    });

    // Create session record
    await client.execute({
      sql: `INSERT INTO sessions (id, table_id, table_name, table_kind, customer_name, customer_phone, hourly_rate, rate_snapshot, started_at, status, paid, payment_status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, 'Unpaid', ?)`,
      args: [
        sessionId,
        params.tableId,
        params.tableName,
        params.tableKind || "Snooker",
        params.player,
        params.phone || null,
        params.hourlyRate,
        params.hourlyRate,
        params.startedAtIso,
        params.createdBy || "manager",
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to start arena session in Turso:", err);
    return false;
  }
}

/** 15. Settle / End Arena Session in Turso */
export async function settleArenaSession(params: {
  tableId: string;
  tableAmount: number;
  itemsAmount: number;
  discountAmount: number;
  discountReason?: string;
  finalTotal: number;
  paymentMethod: string;
  durationMins: number;
}) {
  try {
    const client = getTursoClient();

    // Reset table status to available
    await client.execute({
      sql: `UPDATE club_tables 
            SET status = 'available', current_player = NULL, current_phone = NULL, session_started_at = NULL, notes = NULL, updated_at = datetime('now')
            WHERE id = ?`,
      args: [params.tableId],
    });

    // Update latest active session for this table
    await client.execute({
      sql: `UPDATE sessions
            SET status = 'completed', ended_at = datetime('now'), duration_minutes = ?, table_amount = ?, items_amount = ?, discount_amount = ?, discount_reason = ?, final_total = ?, paid = 1, payment_status = 'Paid', payment_method = ?, updated_at = datetime('now')
            WHERE id = (
              SELECT id FROM sessions WHERE table_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1
            )`,
      args: [
        params.durationMins,
        params.tableAmount,
        params.itemsAmount,
        params.discountAmount,
        params.discountReason || null,
        params.finalTotal,
        params.paymentMethod,
        params.tableId,
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to settle arena session in Turso:", err);
    return false;
  }
}


/** 16. Start Timed Floor Session (Atomic Server Guard & Snapshot) */
export async function startFloorSession(params: {
  tableId: string;
  tableName: string;
  tableKind: TableKind;
  playerName: string;
  phone?: string;
  durationChoice: "30m" | "1h";
  rateSnapshot: number;
  managerName?: string;
}): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const client = getTursoClient();

    // 1. Atomic Availability Guard
    const checkTable = await client.execute({
      sql: "SELECT status FROM club_tables WHERE id = ?",
      args: [params.tableId],
    });

    if (checkTable.rows.length > 0 && checkTable.rows[0].status === "playing") {
      return { success: false, error: "Table is already occupied by an active match." };
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    // For Pool table testing, 30m option is set to 2 minutes
    const isPool = params.tableKind === "Pool" || params.tableId.toLowerCase().includes("pool");
    const durationMins = params.durationChoice === "1h" ? 60 : (isPool ? 2 : 30);
    const scheduledEndIso = new Date(Date.now() + durationMins * 60000).toISOString();

    // 2. Insert Session with Rate Snapshot and Scheduled End
    await client.execute({
      sql: `INSERT INTO sessions (
              id, table_id, table_name, table_kind, customer_name, customer_phone,
              hourly_rate, rate_snapshot, started_at, scheduled_end_at, duration_choice, duration_minutes,
              table_amount, final_total, status, paid, payment_status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, 'Unpaid', ?)`,
      args: [
        sessionId,
        params.tableId,
        params.tableName,
        params.tableKind,
        params.playerName.trim(),
        params.phone ? params.phone.trim() : null,
        params.rateSnapshot,
        params.rateSnapshot,
        nowIso,
        scheduledEndIso,
        params.durationChoice,
        durationMins,
        params.rateSnapshot,
        params.rateSnapshot,
        params.managerName || "manager",
      ],
    });

    // 3. Mark Table Occupied
    await client.execute({
      sql: `UPDATE club_tables 
            SET status = 'playing', current_player = ?, current_phone = ?,
                session_started_at = ?, scheduled_end_at = ?, duration_choice = ?,
                current_session_id = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        params.playerName.trim(),
        params.phone ? params.phone.trim() : null,
        nowIso,
        scheduledEndIso,
        params.durationChoice,
        sessionId,
        params.tableId,
      ],
    });

    // 4. Record Audit Log
    await client.execute({
      sql: `INSERT INTO audit_logs (id, action, role, target_id, details) VALUES (?, ?, ?, ?, ?)`,
      args: [
        `audit_${Date.now()}`,
        "START_SESSION",
        "staff",
        params.tableId,
        JSON.stringify({
          sessionId,
          tableName: params.tableName,
          player: params.playerName,
          duration: params.durationChoice,
          price: params.rateSnapshot,
          manager: params.managerName || "manager",
        }),
      ],
    });

    if (typeof window !== "undefined") {
      const alertNotif = {
        id: `start-alert-${sessionId}-${Date.now()}`,
        title: `🟢 Match Started: ${params.tableName}`,
        body: `Match for "${params.playerName.trim()}" (${params.durationChoice} · ₹${params.rateSnapshot}) started by ${params.managerName || "manager"}.`,
        table_id: params.tableId,
        table_name: params.tableName,
        type: "session_start" as const,
        timestamp: Date.now(),
        read: false,
      };

      window.dispatchEvent(
        new CustomEvent("levelup_trigger_notif", { detail: alertNotif })
      );
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));

      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({
          type: "TRIGGER_FLOOR_ALERT",
          notif: alertNotif,
        });
        bc.postMessage({ type: "floor_update", action: "start_session", tableId: params.tableId });
        bc.close();
      } catch (e) {}
    }

    return { success: true, sessionId };
  } catch (err) {
    console.error("Failed to start floor session:", err);
    return { success: false, error: String(err) };
  }
}

/** 17. Extend Active Floor Session */
export async function extendFloorSession(params: {
  tableId: string;
  sessionId?: string;
  extensionChoice: "30m" | "1h";
  extensionPrice: number;
  managerName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();

    // Query active session
    let sess: any = null;
    if (params.sessionId) {
      const res = await client.execute({
        sql: "SELECT * FROM sessions WHERE id = ? AND status = 'active'",
        args: [params.sessionId],
      });
      sess = res.rows[0];
    }
    if (!sess) {
      const res = await client.execute({
        sql: "SELECT * FROM sessions WHERE table_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
        args: [params.tableId],
      });
      sess = res.rows[0];
    }

    if (!sess) {
      return { success: false, error: "No active session found to extend." };
    }

    const isPool = String(sess.table_kind || params.tableId).toLowerCase().includes("pool");
    const extMins = params.extensionChoice === "1h" ? 60 : (isPool ? 2 : 30);
    const currentEndMs = sess.scheduled_end_at ? new Date(sess.scheduled_end_at).getTime() : Date.now();
    // If time was already up, extend from now; otherwise extend from scheduled end
    const baseMs = Math.max(Date.now(), currentEndMs);
    const newScheduledEnd = new Date(baseMs + extMins * 60000).toISOString();

    // Update Session: scheduled_end_at, duration_minutes, extension_count, extension_amount, table_amount, final_total
    await client.execute({
      sql: `UPDATE sessions 
            SET scheduled_end_at = ?,
                duration_minutes = duration_minutes + ?,
                extension_count = COALESCE(extension_count, 0) + 1,
                extension_amount = COALESCE(extension_amount, 0) + ?,
                table_amount = table_amount + ?,
                final_total = final_total + ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        newScheduledEnd,
        extMins,
        params.extensionPrice,
        params.extensionPrice,
        params.extensionPrice,
        sess.id,
      ],
    });

    // Update club table scheduled end
    await client.execute({
      sql: "UPDATE club_tables SET scheduled_end_at = ?, updated_at = datetime('now') WHERE id = ?",
      args: [newScheduledEnd, params.tableId],
    });

    // Audit log
    await client.execute({
      sql: `INSERT INTO audit_logs (id, action, role, target_id, details) VALUES (?, ?, ?, ?, ?)`,
      args: [
        `audit_${Date.now()}`,
        "EXTEND_SESSION",
        "staff",
        params.tableId,
        JSON.stringify({
          sessionId: sess.id,
          extension: params.extensionChoice,
          price: params.extensionPrice,
          newEnd: newScheduledEnd,
          manager: params.managerName || "manager",
        }),
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({ type: "floor_update", action: "extend_session", tableId: params.tableId });
        bc.close();
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to extend session:", err);
    return { success: false, error: String(err) };
  }
}

/** 18. Add F&B Snacks / Cigarettes / Drinks to Session */
export async function addSessionItems(params: {
  sessionId: string;
  tableId?: string;
  items: { productId: string; productName: string; quantity: number; unitPrice: number }[];
  managerName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();
    let totalAdded = 0;

    for (const item of params.items) {
      if (item.quantity <= 0) continue;
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const lineTotal = item.quantity * item.unitPrice;
      totalAdded += lineTotal;

      await client.execute({
        sql: `INSERT INTO session_items (id, session_id, product_id, product_name, quantity, unit_price, total_price, added_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          itemId,
          params.sessionId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          lineTotal,
        ],
      });
    }

    // Update Session items_amount and final_total
    await client.execute({
      sql: `UPDATE sessions 
            SET items_amount = COALESCE(items_amount, 0) + ?,
                final_total = final_total + ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [totalAdded, totalAdded, params.sessionId],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({ type: "floor_update", action: "add_items", sessionId: params.sessionId });
        bc.close();
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to add session items:", err);
    return { success: false, error: String(err) };
  }
}

/** 19. Get Add-on Items for a Session */
export async function getSessionItems(sessionId: string): Promise<SessionItem[]> {
  try {
    const client = getTursoClient();
    const res = await client.execute({
      sql: "SELECT * FROM session_items WHERE session_id = ? ORDER BY added_at ASC",
      args: [sessionId],
    });

    return res.rows.map((r: any) => ({
      id: String(r.id),
      session_id: String(r.session_id),
      product_id: String(r.product_id),
      product_name: String(r.product_name),
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      total_price: Number(r.total_price),
      added_at: String(r.added_at),
    }));
  } catch (err) {
    console.debug("Error loading session items:", err);
    return [];
  }
}

/** 20. Settle Payment & Free Table (Cash, UPI, Mixed, or Udhar) */
export async function collectFloorPayment(params: {
  tableId: string;
  sessionId: string;
  finalTotal: number;
  cashReceived: number;
  upiReceived: number;
  udharAmount: number;
  upiReference?: string;
  discountAmount?: number;
  discountReason?: string;
  managerName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();

    const totalPaid = params.cashReceived + params.upiReceived;
    let paymentStatus: "Paid" | "Partially Paid" | "Unpaid" = "Paid";
    let isPaid = 1;

    if (params.udharAmount > 0) {
      if (totalPaid > 0) {
        paymentStatus = "Partially Paid";
        isPaid = 0;
      } else {
        paymentStatus = "Unpaid";
        isPaid = 0;
      }
    }

    let paymentMethod = "cash";
    if (params.cashReceived > 0 && params.upiReceived > 0) {
      paymentMethod = "split";
    } else if (params.upiReceived > 0) {
      paymentMethod = "upi";
    } else if (params.cashReceived > 0) {
      paymentMethod = "cash";
    } else if (params.udharAmount > 0) {
      paymentMethod = "udhar";
    }

    // 1. Update session to completed
    await client.execute({
      sql: `UPDATE sessions 
            SET status = 'completed',
                ended_at = datetime('now'),
                final_total = ?,
                discount_amount = ?,
                discount_reason = ?,
                cash_paid = ?,
                upi_paid = ?,
                udhar_amount = ?,
                upi_reference = ?,
                paid = ?,
                payment_status = ?,
                payment_method = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        params.finalTotal,
        params.discountAmount || 0,
        params.discountReason || null,
        params.cashReceived,
        params.upiReceived,
        params.udharAmount,
        params.upiReference || null,
        isPaid,
        paymentStatus,
        paymentMethod,
        params.sessionId,
      ],
    });

    // 2. Free Table
    await client.execute({
      sql: `UPDATE club_tables 
            SET status = 'available',
                current_player = NULL,
                current_phone = NULL,
                session_started_at = NULL,
                scheduled_end_at = NULL,
                duration_choice = NULL,
                current_session_id = NULL,
                notes = NULL,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [params.tableId],
    });

    // 3. Audit Log
    await client.execute({
      sql: `INSERT INTO audit_logs (id, action, role, target_id, details) VALUES (?, ?, ?, ?, ?)`,
      args: [
        `audit_${Date.now()}`,
        "SETTLE_PAYMENT",
        "staff",
        params.tableId,
        JSON.stringify({
          sessionId: params.sessionId,
          finalTotal: params.finalTotal,
          cash: params.cashReceived,
          upi: params.upiReceived,
          udhar: params.udharAmount,
          method: paymentMethod,
          status: paymentStatus,
          manager: params.managerName || "manager",
        }),
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({ type: "floor_update", action: "settle_payment", tableId: params.tableId });
        bc.close();
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to collect floor payment:", err);
    return { success: false, error: String(err) };
  }
}

/** 21. Remove specific Add-on item from Session */
export async function removeSessionItem(params: {
  itemId: string;
  sessionId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();

    // Query item to get line total
    const itemRes = await client.execute({
      sql: "SELECT total_price FROM session_items WHERE id = ? AND session_id = ?",
      args: [params.itemId, params.sessionId],
    });

    if (itemRes.rows.length === 0) {
      return { success: false, error: "Item not found." };
    }

    const itemPrice = Number(itemRes.rows[0].total_price || 0);

    // Delete item
    await client.execute({
      sql: "DELETE FROM session_items WHERE id = ? AND session_id = ?",
      args: [params.itemId, params.sessionId],
    });

    // Deduct from session totals
    await client.execute({
      sql: `UPDATE sessions 
            SET items_amount = MAX(0, COALESCE(items_amount, 0) - ?),
                final_total = MAX(0, final_total - ?),
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [itemPrice, itemPrice, params.sessionId],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({ type: "floor_update", action: "remove_item", sessionId: params.sessionId });
        bc.close();
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to remove session item:", err);
    return { success: false, error: String(err) };
  }
}

/** 22. Void or Delete Session (Notifies Owner & Logs Audit) */
export async function voidOrDeleteSession(params: {
  sessionId: string;
  tableId: string;
  tableName: string;
  playerName?: string;
  managerName?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();

    // 1. Reset Table status to available
    await client.execute({
      sql: `UPDATE club_tables 
            SET status = 'available',
                current_player = NULL,
                current_phone = NULL,
                session_started_at = NULL,
                scheduled_end_at = NULL,
                duration_choice = NULL,
                current_session_id = NULL,
                notes = NULL,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [params.tableId],
    });

    // 2. Permanently remove session items and session record
    try {
      await client.execute({
        sql: "DELETE FROM session_items WHERE session_id = ?",
        args: [params.sessionId],
      });
      await client.execute({
        sql: "DELETE FROM sessions WHERE id = ?",
        args: [params.sessionId],
      });
    } catch (sessionErr) {
      console.warn("Session delete fallback:", sessionErr);
    }

    // 3. Insert critical audit trail log for Owner oversight
    const auditId = `audit_void_${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO audit_logs (id, action, role, target_id, details) VALUES (?, ?, ?, ?, ?)`,
      args: [
        auditId,
        "VOID_SESSION",
        "staff",
        params.sessionId,
        JSON.stringify({
          tableId: params.tableId,
          tableName: params.tableName,
          player: params.playerName || "Walk-in",
          deletedBy: params.managerName || "manager",
          reason: params.reason || "Manual session deletion",
          timestamp: new Date().toISOString(),
        }),
      ],
    });

    // 4. Trigger alert notification for Owner
    if (typeof window !== "undefined") {
      const alertNotif = {
        id: `void-alert-${params.sessionId}-${Date.now()}`,
        title: `⚠️ Match Deleted: ${params.tableName}`,
        body: `Match for "${params.playerName || "Walk-in"}" was deleted by ${params.managerName || "manager"}.`,
        table_id: params.tableId,
        table_name: params.tableName,
        type: "session_end" as const,
        timestamp: Date.now(),
        read: false,
      };

      window.dispatchEvent(
        new CustomEvent("levelup_trigger_notif", { detail: alertNotif })
      );
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));

      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({
          type: "TRIGGER_FLOOR_ALERT",
          notif: alertNotif,
        });
        bc.postMessage({ type: "floor_update", action: "void_session", tableId: params.tableId });
        bc.close();
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to void session:", err);
    return { success: false, error: String(err) };
  }
}

/** 22b. Delete Customer Record and all associated match entries */
export async function deleteCustomerRecord(params: {
  customerName: string;
  customerPhone?: string;
  managerName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTursoClient();

    // 1. Find all sessions for this customer name or phone
    const qPhone = params.customerPhone && params.customerPhone.trim() !== "null" ? params.customerPhone.trim() : null;
    const res = await client.execute({
      sql: `SELECT id, table_id FROM sessions 
            WHERE customer_name = ? 
               OR (customer_phone IS NOT NULL AND customer_phone != '' AND customer_phone = ?)`,
      args: [params.customerName.trim(), qPhone || "NO_MATCH_PHONE"],
    });

    for (const r of res.rows as any[]) {
      const sId = String(r.id);
      const tId = String(r.table_id);

      await client.execute({ sql: "DELETE FROM session_items WHERE session_id = ?", args: [sId] });
      await client.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [sId] });

      // Free table if this session was active
      await client.execute({
        sql: `UPDATE club_tables 
              SET status = 'available', current_player = NULL, current_phone = NULL,
                  session_started_at = NULL, scheduled_end_at = NULL, duration_choice = NULL,
                  current_session_id = NULL, updated_at = datetime('now')
              WHERE current_session_id = ?`,
        args: [sId],
      });
    }

    // Record audit
    await client.execute({
      sql: `INSERT INTO audit_logs (id, action, role, details) VALUES (?, ?, ?, ?)`,
      args: [
        `audit_del_cust_${Date.now()}`,
        "DELETE_CUSTOMER",
        "staff",
        JSON.stringify({
          customer: params.customerName,
          phone: params.customerPhone,
          deletedBy: params.managerName || "manager",
          timestamp: new Date().toISOString(),
        }),
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({ type: "floor_update", action: "delete_customer" });
        bc.close();
      } catch (e) {}
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to delete customer:", err);
    return { success: false, error: String(err) };
  }
}

/** 23. Settle Customer Outstanding Udhar */
export async function settleCustomerUdhar(params: {
  customerName: string;
  customerPhone?: string;
  amountCollected: number;
  paymentMethod: "cash" | "upi";
  upiReference?: string;
  managerName?: string;
}): Promise<{ success: boolean; settledAmount?: number; error?: string }> {
  try {
    const client = getTursoClient();

    // 1. Fetch unpaid or partial sessions for this customer
    const res = await client.execute({
      sql: `SELECT id, final_total, cash_paid, upi_paid, udhar_amount, status
            FROM sessions
            WHERE (customer_name = ? OR (customer_phone IS NOT NULL AND customer_phone != '' AND customer_phone = ?))
              AND (paid = 0 OR udhar_amount > 0)
              AND status != 'voided'
            ORDER BY started_at ASC`,
      args: [params.customerName, params.customerPhone || params.customerName],
    });

    let remainingToApply = params.amountCollected;
    let totalSettled = 0;

    for (const row of res.rows as any[]) {
      if (remainingToApply <= 0) break;
      const sessId = String(row.id);
      const finalTot = Number(row.final_total || 0);
      const existingCash = Number(row.cash_paid || 0);
      const existingUpi = Number(row.upi_paid || 0);
      const existingUdhar = Number(row.udhar_amount ?? Math.max(0, finalTot - existingCash - existingUpi));

      if (existingUdhar <= 0) continue;

      const applyAmt = Math.min(remainingToApply, existingUdhar);
      const newUdhar = Math.max(0, existingUdhar - applyAmt);
      const isNowPaid = newUdhar === 0 ? 1 : 0;
      const newStatus = isNowPaid ? "Paid" : "Partially Paid";
      const newCash = params.paymentMethod === "cash" ? existingCash + applyAmt : existingCash;
      const newUpi = params.paymentMethod === "upi" ? existingUpi + applyAmt : existingUpi;

      await client.execute({
        sql: `UPDATE sessions
              SET paid = ?,
                  payment_status = ?,
                  payment_method = ?,
                  cash_paid = ?,
                  upi_paid = ?,
                  udhar_amount = ?,
                  upi_reference = COALESCE(?, upi_reference),
                  updated_at = datetime('now')
              WHERE id = ?`,
        args: [
          isNowPaid,
          newStatus,
          params.paymentMethod,
          newCash,
          newUpi,
          newUdhar,
          params.upiReference || null,
          sessId,
        ],
      });

      remainingToApply -= applyAmt;
      totalSettled += applyAmt;
    }

    // 2. Insert audit log
    await client.execute({
      sql: `INSERT INTO audit_logs (id, action, role, details) VALUES (?, ?, ?, ?)`,
      args: [
        `audit_udhar_${Date.now()}`,
        "COLLECT_UDHAR",
        "staff",
        JSON.stringify({
          customer: params.customerName,
          phone: params.customerPhone,
          amountCollected: params.amountCollected,
          method: params.paymentMethod,
          upiRef: params.upiReference,
          manager: params.managerName || "manager",
          timestamp: new Date().toISOString(),
        }),
      ],
    });

    // 3. Trigger alert notification for Owner
    if (typeof window !== "undefined") {
      const alertNotif = {
        id: `udhar-collect-${Date.now()}`,
        title: `💵 Udhar Collected: ${params.customerName}`,
        body: `₹${params.amountCollected} collected via ${params.paymentMethod.toUpperCase()} by ${params.managerName || "manager"}.`,
        type: "session_end" as const,
        timestamp: Date.now(),
        read: false,
      };

      window.dispatchEvent(new CustomEvent("levelup_trigger_notif", { detail: alertNotif }));
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));

      try {
        const bc = new BroadcastChannel("levelup_floor_sync");
        bc.postMessage({
          type: "TRIGGER_FLOOR_ALERT",
          notif: alertNotif,
        });
        bc.postMessage({ type: "floor_update", action: "settle_udhar" });
        bc.close();
      } catch (e) {}
    }

    return { success: true, settledAmount: totalSettled };
  } catch (err) {
    console.error("Failed to settle customer udhar:", err);
    return { success: false, error: String(err) };
  }
}
