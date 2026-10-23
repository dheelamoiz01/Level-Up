export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "rgba(0, 199, 138, 0.12)",
          border: "1px solid rgba(0, 199, 138, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: 13,
            color: "var(--accent-primary)",
            letterSpacing: "0.05em",
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
          }}
        >
          LU
        </span>
      </div>
      {!compact && (
        <span
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            fontSize: 15,
            color: "var(--text-primary)",
          }}
        >
          LEVEL <span style={{ color: "var(--accent-primary)" }}>UP</span>
        </span>
      )}
    </div>
  );
}
