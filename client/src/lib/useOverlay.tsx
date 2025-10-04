import { createContext, useContext, useState, ReactNode } from 'react';

interface OverlayContextType {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  canOpen: (id: string) => boolean;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const canOpen = (id: string) => {
    if (openId === null || openId === id) return true;
    console.warn(`[useOverlay] Cannot open "${id}" - "${openId}" is already open. Use Sheet for nested UI.`);
    return false;
  };

  return (
    <OverlayContext.Provider value={{ openId, setOpenId, canOpen }}>
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within OverlayProvider');
  }
  return context;
}
