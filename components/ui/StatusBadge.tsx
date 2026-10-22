import type { TableStatus } from "@/lib/types";
const text: Record<TableStatus, string> = { available: "Available", playing: "Playing", paused: "Paused", maintenance: "Maintenance" };
export function StatusBadge({ status }: { status: TableStatus }) {
  return <span className="badge" data-s={status}>{text[status]}</span>;
}
