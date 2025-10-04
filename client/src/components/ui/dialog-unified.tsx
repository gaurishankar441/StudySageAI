import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  closeOnOuterClick?: boolean;
  description?: string;
};

export function DialogUnified({
  open,
  onClose,
  title,
  children,
  size = "md",
  closeOnOuterClick = true,
  description,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation trigger
  useEffect(() => {
    if (open) {
      setIsAnimating(true);
    }
  }, [open]);

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

    // Focus first interactive element with slight delay for animation
    setTimeout(() => {
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);

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
    sm: "w-[min(100vw-2rem,30rem)]", // 480px
    md: "w-[min(100vw-2rem,45rem)]", // 720px  
    lg: "w-[min(100vw-2rem,60rem)]", // 960px
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-description" : undefined}
      className="fixed inset-0 z-[1000] grid place-items-center p-4"
      data-dialog-container
    >
      {/* Opaque Scrim - Material Design spec: 56-60% opacity */}
      <div
        data-backdrop
        className={`
          fixed inset-0 bg-slate-900/60 
          transition-opacity duration-[180ms] ease-out
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ zIndex: 1000 }}
        onClick={() => closeOnOuterClick && onClose()}
        aria-hidden="true"
      />

      {/* Modal Panel - scale + opacity animation 180ms */}
      <div
        ref={ref}
        className={`
          relative ${sizeClasses[size]}
          rounded-xl bg-white dark:bg-slate-900
          shadow-[0_20px_60px_-12px_rgba(2,6,23,0.35)]
          outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          transition-all duration-[180ms] ease-out
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0'}
        `}
        style={{ zIndex: 1001 }}
        data-dialog-panel
      >
        {title && (
          <div className="flex items-start justify-between p-6 sm:p-7 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 id="dialog-title" className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              {description && (
                <p id="dialog-description" className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              data-testid="button-close-dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-6 sm:p-7 md:p-8 overflow-y-auto max-h-[80vh]" data-dialog-content>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
