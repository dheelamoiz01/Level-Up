import { createClient } from "./client";
import type { ClubTable, Product, SessionRow } from "../types";
import { initialTables } from "../mock/tables";
import { initialProducts } from "../mock/products";

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

/** 1. Fetch real club tables from Supabase */
export async function getLiveTables(): Promise<ClubTable[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("club_tables")
      .select("*")
      .order("number", { ascending: true });

    if (error || !data || data.length === 0) {
      // Auto-seed if table is empty in fresh Supabase
      if (!error && data && data.length === 0) {
        await seedDefaultTables(supabase);
      }
      return initialTables;
    }

    return data.map((row: any) => {
      const isPlaying = row.status === "playing";
      return {
        id: row.id,
        number: row.number,
        name: row.name,
        kind: row.kind,
        status: row.status,
        hourly_rate: Number(row.hourly_rate),
        min_fee: Number(row.min_fee || 50),
        player: row.current_player || undefined,
        phone: row.current_phone || undefined,
        session_started_at: row.session_started_at || undefined,
        elapsed: isPlaying ? formatDurationFromStart(row.session_started_at) : undefined,
        bill: isPlaying
          ? calculateAccruedBill(row.session_started_at, Number(row.hourly_rate), Number(row.min_fee || 50))
          : undefined,
        notes: row.notes || undefined,
      };
    });
  } catch (err) {
    console.debug("Error fetching live tables, falling back to clean fleet:", err);
    return initialTables;
  }
}

/** 2. Fetch real products / menu from Supabase */
export async function getLiveProducts(): Promise<Product[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      if (!error && data && data.length === 0) {
        await seedDefaultProducts(supabase);
      }
      return initialProducts;
    }

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      cost_price: Number(p.cost_price || Math.round(Number(p.price) * 0.6)),
      active: p.active ?? true,
      stock_count: p.stock_count ?? 50,
    }));
  } catch (err) {
    console.debug("Error fetching live products, falling back to initial items:", err);
    return initialProducts;
  }
}

/** 3. Fetch real sessions ledger from Supabase */
export async function getLiveSessions(): Promise<SessionRow[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30);

    if (error || !data) {
      return [];
    }

    return data.map((s: any) => {
      const start = new Date(s.started_at);
      const end = s.ended_at ? new Date(s.ended_at) : new Date();
      const diffMins = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      return {
        id: s.id,
        table_id: s.table_id || "table",
        table: s.table_name || "Arena Table",
        player: s.customer_name || "Walk-in Player",
        phone: s.customer_phone || undefined,
        hourly_rate: Number(s.hourly_rate),
        started_at: s.started_at,
        ended_at: s.ended_at || undefined,
        duration: durationStr,
        duration_minutes: diffMins,
        table_amount: Number(s.table_amount || 0),
        items_amount: Number(s.items_amount || 0),
        discount_amount: Number(s.discount_amount || 0),
        discount_reason: s.discount_reason || undefined,
        amount: Number(s.final_total || 0),
        paid: Boolean(s.paid),
        payment_method: s.payment_method || "cash",
      };
    });
  } catch (err) {
    console.debug("Error fetching live sessions:", err);
    return [];
  }
}

/** Auto-seed tables if user has an empty Supabase instance */
async function seedDefaultTables(supabase: ReturnType<typeof createClient>) {
  try {
    const rows = initialTables.map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      kind: t.kind,
      status: "available",
      hourly_rate: t.hourly_rate,
      min_fee: t.min_fee || 50,
      notes: t.notes,
    }));
    await supabase.from("club_tables").upsert(rows);
  } catch {}
}

/** Auto-seed products if user has an empty Supabase instance */
async function seedDefaultProducts(supabase: ReturnType<typeof createClient>) {
  try {
    const rows = initialProducts.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      cost_price: p.cost_price,
      active: p.active,
      stock_count: p.stock_count,
    }));
    await supabase.from("products").upsert(rows);
  } catch {}
}
