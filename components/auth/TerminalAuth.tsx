"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Lock, User, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";

export function TerminalAuth() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = login(username, password);
    if (!result.success) {
      setError(result.error || "Authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto",
        backgroundImage: "url('/snooker-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#111315",
      }}
    >
      {/* Dark Overlay & Atmospheric Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(17, 19, 21, 0.72) 0%, rgba(17, 19, 21, 0.9) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(17, 19, 21, 0.5) 0%, rgba(17, 19, 21, 0.88) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Premium LEVEL UP Branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            marginBottom: 20,
            userSelect: "none",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#F3F4F6",
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            LEVEL <span style={{ color: "var(--accent-primary)" }}>UP</span>
          </h1>
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            Snooker &amp; Pool Club
          </span>
        </div>

        {/* Refined Translucent Charcoal Login Card */}
        <div
          style={{
            width: "100%",
            background: "rgba(24, 27, 30, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--r-lg)",
            padding: "32px 28px",
            boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Authentication Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#F87171",
                  fontSize: 12,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Username Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                }}
              >
                Username
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-sm)",
                  padding: "0 12px",
                  height: 42,
                  transition: "border-color 0.15s ease",
                }}
              >
                <User size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="username"
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    width: "100%",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                }}
              >
                Password
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-sm)",
                  padding: "0 12px",
                  height: 42,
                  transition: "border-color 0.15s ease",
                }}
              >
                <Lock size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    width: "100%",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                height: 42,
                fontSize: 13,
                fontWeight: 600,
                marginTop: 6,
                gap: 8,
              }}
            >
              <span>{loading ? "Signing in..." : "Sign In to Terminal"}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
