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

export const mockSessions: SessionRow[] = [
  {
    id: "s1",
    table_id: "t-royal-1",
    table: "Royal Table 1",
    player: "Aarav S.",
    phone: "+91 98200 12345",
    hourly_rate: 500,
    started_at: new Date(Date.now() - 54 * 60 * 1000).toISOString(),
    duration: "0h 54m",
    table_amount: 450,
    items_amount: 320,
    discount_amount: 0,
    amount: 770,
    paid: true,
    payment_method: "upi",
  },
  {
    id: "s2",
    table_id: "t-snooker-1",
    table: "Snooker Table 1",
    player: "Dev & Rohan",
    phone: "+91 98765 43210",
    hourly_rate: 350,
    started_at: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    duration: "1h 25m",
    table_amount: 500,
    items_amount: 200,
    discount_amount: 0,
    amount: 700,
    paid: false,
    payment_method: "udhar",
  },
  {
    id: "s3",
    table_id: "t-pool-1",
    table: "Pool Table 1",
    player: "Nisha & Co.",
    phone: "+91 97111 88990",
    hourly_rate: 250,
    started_at: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    duration: "0h 48m",
    table_amount: 200,
    items_amount: 120,
    discount_amount: 20,
    discount_reason: "Member Courtesy",
    amount: 300,
    paid: true,
    payment_method: "cash",
  },
];
