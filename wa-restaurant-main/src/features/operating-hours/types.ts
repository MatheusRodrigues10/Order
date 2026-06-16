export interface OperatingHours {
  id: string;
  weekDay: number; // 0=Sun .. 6=Sat
  period: "lunch" | "dinner";
  openingTime: string;
  closingTime: string;
  defaultReservationDuration: number; // minutes
  defaultCleaningDuration: number;    // minutes
}
