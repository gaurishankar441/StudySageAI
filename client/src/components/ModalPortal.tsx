import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ModalPortal({ children }: { children: ReactNode }) {
  const modalRoot = document.getElementById('modal-root');
  
  if (!modalRoot) {
    console.error('modal-root element not found');
    return null;
  }
  
  return createPortal(children, modalRoot);
}
