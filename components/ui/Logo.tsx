export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, userSelect: "none" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: "linear-gradient(135deg, rgba(92, 242, 176, 0.18) 0%, rgba(16, 185, 129, 0.08) 100%)",
          border: "1px solid rgba(92, 242, 176, 0.35)",
          boxShadow: "0 0 16px -2px rgba(16, 185, 129, 0.4), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
          <defs>
            <linearGradient id="logo-em-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5cf2b0" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" stroke="url(#logo-em-grad)" strokeWidth="1.75" strokeOpacity="0.8" />
          <path d="M16 6.5L23.5 16H18.5V25.5H13.5V16H8.5L16 6.5Z" fill="url(#logo-em-grad)" />
        </svg>
      </div>
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span
            className="label"
            style={{
              fontWeight: 800,
              letterSpacing: ".14em",
              fontSize: 15,
              color: "var(--text-hero)",
            }}
          >
            LEVEL<span style={{ color: "var(--mint)", textShadow: "0 0 12px rgba(92, 242, 176, 0.5)" }}>UP</span>
          </span>
          <span style={{ fontSize: 10, letterSpacing: ".06em", color: "var(--muted)", textTransform: "uppercase" }}>
            Cue & Club OS
          </span>
        </div>
      )}
    </div>
  );
}
