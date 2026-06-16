const ITEMS = [
  { label: "Disponível", className: "bg-status-available" },
  { label: "Reservada",  className: "bg-status-reserved" },
  { label: "Ocupada",    className: "bg-status-occupied" },
  { label: "Limpeza",    className: "bg-status-cleaning" },
  { label: "Bloqueada",  className: "bg-status-blocked" },
];

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-border/60 bg-card/60 px-4 py-3">
      <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Legenda
      </span>
      {ITEMS.map((i) => (
        <div key={i.label} className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${i.className}`} />
          <span className="text-xs text-foreground/80">{i.label}</span>
        </div>
      ))}
    </div>
  );
}
