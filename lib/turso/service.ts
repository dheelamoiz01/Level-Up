import { getTursoClient } from "./client";
import type { ClubTable, Product, SessionRow } from "@/lib/types";
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
export async function getLiveSessions(): Promise<SessionRow[]> {
  try {
    const client = getTursoClient();
    const result = await client.execute("SELECT * FROM sessions ORDER BY started_at DESC LIMIT 30");

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
        player: String(s.customer_name || "Walk-in Player"),
        phone: s.customer_phone ? String(s.customer_phone) : undefined,
        hourly_rate: Number(s.hourly_rate),
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
        payment_method: s.payment_method || "cash",
      };
    });
  } catch (err) {
    console.debug("Error fetching sessions from Turso:", err);
    return [];
  }
}

/** 4. Update single table hourly rate in Turso */
export async function updateTableRate(id: string, rate: number) {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: "UPDATE club_tables SET hourly_rate = ?, updated_at = datetime('now') WHERE id = ?",
      args: [rate, id],
    });
    return true;
  } catch (err) {
    console.error("Failed to update table rate in Turso:", err);
    return false;
  }
}

/** 5. Bulk update hourly rates by kind in Turso */
export async function updateBulkTableRates(kind: string, rate: number) {
  try {
    const client = getTursoClient();
    await client.execute({
      sql: "UPDATE club_tables SET hourly_rate = ?, updated_at = datetime('now') WHERE kind = ?",
      args: [rate, kind],
    });
    return true;
  } catch (err) {
    console.error("Failed to update bulk rates in Turso:", err);
    return false;
  }
}
