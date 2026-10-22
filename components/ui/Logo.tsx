export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "rgba(0, 199, 138, 0.08)",
          border: "1px solid #15382A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
          <circle cx="16" cy="16" r="14" stroke="#00C78A" strokeWidth="1.5" strokeOpacity="0.8" />
          <path d="M16 7L23 16H18V25H14V16H9L16 7Z" fill="#00C78A" />
        </svg>
      </div>
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span
            style={{
              fontWeight: 800,
              letterSpacing: ".08em",
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          >
            LEVEL <span style={{ color: "var(--accent-primary)" }}>UP</span>
          </span>
          <span style={{ fontSize: 9.5, letterSpacing: ".08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Cue Club OS
          </span>
        </div>
      )}
    </div>
  );
}
