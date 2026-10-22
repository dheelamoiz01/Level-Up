"use client";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
interface Props { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }
/** Slide-over panel. Reusable for sessions, customers, products. */
export function Drawer({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <div className="drawer-root" data-open={open} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="glass-card glass-card-floating drawer" role="dialog" aria-label={title}>
        <header className="drawer-head"><h2>{title}</h2><Button icon aria-label="Close" onClick={onClose}><X size={17} /></Button></header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}
