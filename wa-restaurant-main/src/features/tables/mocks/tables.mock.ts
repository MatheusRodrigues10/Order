import type { Table, TableStatus } from "../types";
import { reservationsMock } from "@/features/reservations/mocks/reservations.mock";

const TOTAL_TABLES = 70;

// Derive initial statuses from reservations mock so the dashboard tells a story.
const reservedNow = new Set<number>();
const occupiedNow = new Set<number>();
const nextReservationByTable = new Map<number, string>();
const currentReservationByTable = new Map<number, string>();
const joinedByTable = new Map<number, number[]>();

for (const r of reservationsMock) {
  if (r.status === "checked_in") {
    r.tableIds.forEach((id) => {
      occupiedNow.add(id);
      currentReservationByTable.set(id, r.id);
    });
  } else if (r.status === "reserved") {
    r.tableIds.forEach((id) => {
      reservedNow.add(id);
      nextReservationByTable.set(id, r.id);
    });
  }
  if (r.tableIds.length > 1) {
    r.tableIds.forEach((id) => joinedByTable.set(id, r.tableIds));
  }
}

const cleaningTables = new Set<number>([7, 18]);
const blockedTables = new Map<number, string>([
  [40, "Manutenção elétrica"],
  [55, "Equipamento de som"],
]);

export const tablesMock: Table[] = Array.from({ length: TOTAL_TABLES }, (_, i) => {
  const number = i + 1;
  let status: TableStatus = "available";
  if (occupiedNow.has(number)) status = "occupied";
  else if (reservedNow.has(number)) status = "reserved";
  else if (cleaningTables.has(number)) status = "cleaning";
  else if (blockedTables.has(number)) status = "blocked";

  return {
    id: number,
    number,
    seats: 4,
    status,
    currentReservationId: currentReservationByTable.get(number),
    nextReservationId: nextReservationByTable.get(number),
    blockedReason: blockedTables.get(number),
    joinedTables: joinedByTable.get(number),
  };
});
