import { create } from "zustand";
import type { Reservation } from "../types";
import { reservationsMock } from "../mocks/reservations.mock";

interface ReservationStore {
  reservations: Reservation[];
  addReservation: (r: Reservation) => void;
  cancelReservation: (id: string) => void;
  deleteReservation: (id: string) => void;
  getByTable: (tableId: number) => Reservation[];
}

export const useReservationStore = create<ReservationStore>((set, get) => ({
  reservations: reservationsMock,

  addReservation: (r) =>
    set((s) => ({
      reservations: [...s.reservations, r],
    })),

  cancelReservation: (id) =>
    set((s) => ({
      reservations: s.reservations.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)),
    })),

  deleteReservation: (id) =>
    set((s) => ({
      reservations: s.reservations.filter((r) => r.id !== id),
    })),

  getByTable: (tableId) => get().reservations.filter((r) => r.tableIds.includes(tableId)),
}));
