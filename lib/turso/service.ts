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
} from "@/lib/types";
import { initialTables } from "@/lib/mock/tables";
import { initialProducts } from "@/lib/mock/products";

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

/** 1. Fetch real club tables from Turso */
export async function getLiveTables(): Promise<ClubTable[]> {
  try {
    const client = getTursoClient();
    const result = await client.execute("SELECT * FROM club_tables ORDER BY number ASC");

    if (!result.rows || result.rows.length === 0) {
      return initialTables;
    }

    return result.rows.map((row: any) => {
      const isPlaying = row.status === "playing";
      return {
        id: String(row.id),
        number: Number(row.number),
        name: String(row.name),
        kind: row.kind as ClubTable["kind"],
        status: row.status as ClubTable["status"],
        hourly_rate: Number(row.hourly_rate),
        min_fee: Number(row.min_fee || 50),
        player: row.current_player ? String(row.current_player) : undefined,
        phone: row.current_phone ? String(row.current_phone) : undefined,
        session_started_at: row.session_started_at ? String(row.session_started_at) : undefined,
        elapsed: isPlaying && row.session_started_at ? formatDurationFromStart(String(row.session_started_at)) : undefined,
        bill: isPlaying && row.session_started_at
          ? calculateAccruedBill(String(row.session_started_at), Number(row.hourly_rate), Number(row.min_fee || 50))
          : undefined,
        notes: row.notes ? String(row.notes) : undefined,
      };
    });
  } catch (err) {
    console.debug("Error fetching tables from Turso, falling back to clean fleet:", err);
    return initialTables;
  }
}

/** 2. Fetch real products / menu from Turso */
export async function getLiveProducts(): Promise<Product[]> {
  try {
    const client = getTursoClient();
    const result = await client.execute("SELECT * FROM products ORDER BY name ASC");

    if (!result.rows || result.rows.length === 0) {
      return initialProducts;
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
    return initialProducts;
  }
}

/** 3. Fetch real sessions ledger from Turso */
export async function getLiveSessions(limit: number = 50): Promise<SessionRow[]> {
  try {
    const client = getTursoClient();
    const result = await client.execute({
      sql: "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?",
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
        phone: s.customer_phone ? String(s.customer_phone) : undefined,
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
      sql: `SELECT customer_name, customer_phone, started_at, final_total, table_amount, items_amount, paid, payment_method, status 
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
      const dateStr = String(row.started_at).slice(0, 10);
      const custIdentifier = (row.customer_phone || row.customer_name || "").toLowerCase().trim();
      const amount = Number(row.final_total || 0);
      const isPaid = Boolean(row.paid) || row.payment_status === "Paid";

      if (dateStr === today) {
        if (custIdentifier) todayCustomersSet.add(custIdentifier);
        totalRevenueBilled += amount;
        if (isPaid) {
          todayCollection += amount;
          if (row.payment_method === "cash") {
            cashCollection += amount;
          } else {
            digitalCollection += amount;
          }
        }
      } else if (dateStr === yesterday) {
        if (custIdentifier) yesterdayCustomersSet.add(custIdentifier);
        if (isPaid) {
          yesterdayCollection += amount;
        }
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

    // Query today's sessions
    const sessionsRes = await client.execute({
      sql: `SELECT table_kind, customer_name, customer_phone, final_total, paid, duration_minutes 
            FROM sessions 
            WHERE date(started_at) = ?`,
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
  updatedBy: string = "owner"
) {
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
        "owner",
        JSON.stringify({ category, rate_30m, rate_60m, updatedBy }),
      ],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    return true;
  } catch (err) {
    console.error("Failed to update table pricing:", err);
    return false;
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
            WHERE date(started_at) = ?`,
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
