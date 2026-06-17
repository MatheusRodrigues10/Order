export type TableStatus = "available" | "reserved" | "occupied" | "blocked" | "cleaning";

export interface Table {
  id: number;
  number: number;
  seats: number;
  status: TableStatus;
  currentReservationId?: string;
  nextReservationId?: string;
  blockedReason?: string;
  joinedTables?: number[];
}
