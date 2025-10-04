import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  scrim?: "none" | "light";
  closeOnOuterClick?: boolean;
};

export function DialogUnified({
  open,
  onClose,
  title,
  children,
  size = "md",
  scrim = "light",
  closeOnOuterClick = true,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Focus trap + ESC + scroll lock
  useEffect(() => {
    if (!open) return;

    const prev = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add("modal-open");

    const getFocusableElements = () => {
      if (!ref.current) return [];
      const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(ref.current.querySelectorAll<HTMLElement>(selector));
    };

    // Focus first interactive element
    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    // ESC and Tab/Shift+Tab handler
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusables = getFocusableElements();
        if (focusables.length === 0) return;

        const firstFocusable = focusables[0];
        const lastFocusable = focusables[focusables.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if focus is on first element, move to last
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab: if focus is on last element, move to first
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.documentElement.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center p-4"
      data-dialog-container
    >
      {/* Backdrop */}
      <div
        data-backdrop
        className={`fixed inset-0 z-[60] ${
          scrim === "light"
            ? "bg-slate-950/10"
            : "bg-transparent"
        }`}
        onClick={() => closeOnOuterClick && onClose()}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={ref}
        className={`
          relative w-full ${sizeClasses[size]}
          rounded-xl bg-white dark:bg-slate-900
          shadow-lg
          outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          z-[70]
        `}
        data-dialog-panel
      >
        {title && (
          <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              data-testid="button-close-dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto max-h-[80vh]" data-dialog-content>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
