import type { HTMLAttributes, ReactNode } from "react";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "raised" | "inset" | "floating" | "highlight";
  asymmetry?: "1" | "2" | "3" | "4";
  interactive?: boolean;
  children: ReactNode;
}

export function GlassCard({
  variant = "default",
  asymmetry,
  interactive = false,
  className = "",
  children,
  ...rest
}: GlassCardProps) {
  const variantClass = variant !== "default" ? `glass-card-${variant}` : "";
  const asymClass = asymmetry ? `glass-asym-${asymmetry}` : "";
  const interactiveClass = interactive ? "glass-card-interactive" : "";

  return (
    <div
      className={`glass-card ${variantClass} ${asymClass} ${interactiveClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
