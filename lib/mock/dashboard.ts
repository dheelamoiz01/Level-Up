import type { Metric, SessionRow } from "../types";

export const staffMetrics: Metric[] = [
  { label: "Active Sessions", value: "2", hint: "of 5 tables online" },
  { label: "Available Tables", value: "3", hint: "Ready for players" },
  { label: "Floor Turnover", value: "8", delta: "+3 today", hint: "Completed games" },
  { label: "Pending Bills", value: "₹700", hint: "1 unpaid table" },
];

export const ownerMetrics: Metric[] = [
  { label: "Today's Gross", value: "₹14,850", delta: "+12.4%", hint: "vs yesterday" },
  { label: "Net Margin", value: "68.4%", delta: "+3.1%", hint: "₹10,157 profit" },
  { label: "Floor Occupancy", value: "82%", delta: "Peak 7-11 PM", hint: "5 tables tracked" },
  { label: "Outstanding (Udhar)", value: "₹2,100", hint: "3 players logged" },
];

export const mockMetrics = staffMetrics;

export const mockRevenue = [6, 9, 7, 12, 10, 15, 14, 18, 16, 22];

export const mockSessions: SessionRow[] = [];

