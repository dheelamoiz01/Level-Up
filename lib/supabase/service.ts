import { getLiveTables as getTursoTables, getLiveProducts as getTursoProducts, getLiveSessions as getTursoSessions } from "@/lib/turso/service";
import type { ClubTable, Product, SessionRow } from "../types";
import { initialTables } from "../mock/tables";
import { initialProducts } from "../mock/products";

export { formatDurationFromStart, calculateAccruedBill } from "@/lib/turso/service";

/** 1. Fetch real club tables (Turso primary) */
export async function getLiveTables(): Promise<ClubTable[]> {
  try {
    const tables = await getTursoTables();
    if (tables && tables.length > 0) {
      return tables;
    }
  } catch (e) {
    console.debug("Turso tables fetch error, fallback to initial fleet:", e);
  }
  return initialTables;
}

/** 2. Fetch real products / menu (Turso primary) */
export async function getLiveProducts(): Promise<Product[]> {
  try {
    const products = await getTursoProducts();
    if (products && products.length > 0) {
      return products;
    }
  } catch (e) {
    console.debug("Turso products fetch error, fallback to initial products:", e);
  }
  return initialProducts;
}

/** 3. Fetch real sessions ledger (Turso primary) */
export async function getLiveSessions(): Promise<SessionRow[]> {
  try {
    return await getTursoSessions();
  } catch (e) {
    console.debug("Turso sessions fetch error:", e);
    return [];
  }
}
