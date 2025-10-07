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
  const hasInitialFocusRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref updated with latest callback
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Animation trigger
  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      hasInitialFocusRef.current = false;
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

    // Focus first interactive element ONLY on initial open
    if (!hasInitialFocusRef.current) {
      hasInitialFocusRef.current = true; // Set BEFORE setTimeout to prevent race condition
      setTimeout(() => {
        const focusables = getFocusableElements();
        if (focusables.length > 0) {
          focusables[0].focus();
        }
      }, 50);
    }

    // ESC and Tab/Shift+Tab handler - use ref for latest onClose
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current(); // Use ref to get latest callback
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
  }, [open]); // Only depend on open - use ref for onClose to prevent re-renders

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
      {/* Modern Glassmorphism Backdrop with Gradient Overlay */}
      <div
        data-backdrop
        className={`
          fixed inset-0 
          bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20
          backdrop-blur-md
          transition-opacity duration-300 ease-out
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ zIndex: 1000 }}
        onClick={() => closeOnOuterClick && onCloseRef.current()}
        aria-hidden="true"
      />

      {/* Modern Modal Panel - Glassmorphism + Gradient Border */}
      <div
        ref={ref}
        className={`
          relative ${sizeClasses[size]}
          rounded-2xl
          bg-white/95 dark:bg-slate-900/95
          backdrop-blur-xl
          border border-slate-200/50 dark:border-slate-700/50
          shadow-[0_25px_50px_-12px_rgba(124,58,237,0.25)]
          outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          transition-all duration-300 ease-out
          ${isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}
          before:absolute before:inset-0 before:rounded-2xl 
          before:bg-gradient-to-br before:from-indigo-500/10 before:via-purple-500/10 before:to-pink-500/10
          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
        `}
        style={{ zIndex: 1001 }}
        data-dialog-panel
      >
        {title && (
          <div className="flex items-start justify-between p-6 sm:p-7 border-b border-slate-200/50 dark:border-slate-700/50">
            <div>
              <h2 id="dialog-title" className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
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
              onClick={() => onCloseRef.current()}
              aria-label="Close dialog"
              className="rounded-lg p-2 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950 dark:hover:to-purple-950 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              data-testid="button-close-dialog"
            >
              <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
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
