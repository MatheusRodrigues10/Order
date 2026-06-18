import { create } from "zustand";
import type { Table } from "../types";
import { tablesMock } from "../mocks/tables.mock";

interface TableStore {
  tables: Table[];
  setTables: (tables: Table[]) => void;
  updateTable: (id: number, patch: Partial<Table>) => void;
}

export const useTableStore = create<TableStore>((set) => ({
  tables: tablesMock,
  setTables: (tables) => set({ tables }),
  updateTable: (id, patch) =>
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
}));
