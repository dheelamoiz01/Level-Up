import type { ButtonHTMLAttributes } from "react";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: "primary" | "ghost"; icon?: boolean }
export function Button({ variant = "ghost", icon, className = "", ...rest }: Props) {
  return <button className={`btn ${variant === "primary" ? "btn-primary" : ""} ${icon ? "icon-btn" : ""} ${className}`} {...rest} />;
}
