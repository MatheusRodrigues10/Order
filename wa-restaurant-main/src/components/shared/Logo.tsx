interface LogoProps {
  compact?: boolean;
  className?: string;
}

/**
 * WA Restaurant logotype — kanji 和 (wa = harmony) with wordmark.
 * Pure CSS/SVG so it scales without an asset dependency.
 */
export function Logo({ compact = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex h-10 w-9 items-center justify-center rounded-md border border-gold/40 bg-background/40">
        <span className="font-display text-2xl leading-none text-foreground" aria-hidden>
          和
        </span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-lg font-medium tracking-[0.18em] text-foreground">
            WA
          </div>
          <div className="text-[10px] tracking-[0.32em] text-muted-foreground">
            RESTAURANT
          </div>
        </div>
      )}
    </div>
  );
}
