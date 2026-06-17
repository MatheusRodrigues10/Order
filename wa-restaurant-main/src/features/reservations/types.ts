export type ReservationStatus = "pending" | "reserved" | "checked_in" | "finished" | "cancelled";

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  guests: number;
  tableIds: number[];
  date: string; // ISO yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: ReservationStatus;
  notes?: string;
}
