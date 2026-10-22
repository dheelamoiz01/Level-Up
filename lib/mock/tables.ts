import type { ClubTable } from "../types";

export const initialTables: ClubTable[] = [
  {
    id: "t-royal-1",
    number: 1,
    name: "Royal Table 1",
    kind: "Royal",
    status: "available",
    hourly_rate: 500,
    min_fee: 100,
    notes: "VIP match setup with tournament Strachan cloth",
  },
  {
    id: "t-royal-2",
    number: 2,
    name: "Royal Table 2",
    kind: "Royal",
    status: "available",
    hourly_rate: 500,
    min_fee: 100,
    notes: "VIP match setup with tournament Strachan cloth",
  },
  {
    id: "t-snooker-1",
    number: 3,
    name: "Snooker Table 1",
    kind: "Snooker",
    status: "available",
    hourly_rate: 350,
    min_fee: 70,
    notes: "Tournament 12ft table with steel block cushions",
  },
  {
    id: "t-snooker-2",
    number: 4,
    name: "Snooker Table 2",
    kind: "Snooker",
    status: "available",
    hourly_rate: 350,
    min_fee: 70,
    notes: "Tournament 12ft table with steel block cushions",
  },
  {
    id: "t-pool-1",
    number: 5,
    name: "Pool Table 1",
    kind: "Pool",
    status: "available",
    hourly_rate: 250,
    min_fee: 50,
    notes: "9ft American 8-Ball table with fast Simonis cloth",
  },
];

// Backward compatibility export
export const mockTables = initialTables;
