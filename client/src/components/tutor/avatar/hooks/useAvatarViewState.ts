import { useState, useCallback } from 'react';

export type AvatarViewState = 
  | 'minimized'       // Small preview bubble (bottom-right)
  | 'half'            // Medium panel with controls
  | 'fullscreen'      // Full screen avatar only
  | 'fullscreen-chat'; // Full screen with chat panel

interface AvatarViewStateReturn {
  viewState: AvatarViewState;
  isTransitioning: boolean;
  expandToHalf: () => void;
  expandToFull: () => void;
  openChat: () => void;
  closeChat: () => void;
  minimizeToHalf: () => void;
  minimizeToBubble: () => void;
}

const TRANSITION_DURATION = 300; // ms

export function useAvatarViewState(initialState: AvatarViewState = 'minimized'): AvatarViewStateReturn {
  const [viewState, setViewState] = useState<AvatarViewState>(initialState);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transition = useCallback((to: AvatarViewState) => {
    setIsTransitioning(true);
    setViewState(to);
    setTimeout(() => {
      setIsTransitioning(false);
    }, TRANSITION_DURATION);
  }, []);

  const expandToHalf = useCallback(() => {
    transition('half');
  }, [transition]);

  const expandToFull = useCallback(() => {
    transition('fullscreen');
  }, [transition]);

  const openChat = useCallback(() => {
    transition('fullscreen-chat');
  }, [transition]);

  const closeChat = useCallback(() => {
    transition('fullscreen');
  }, [transition]);

  const minimizeToHalf = useCallback(() => {
    transition('half');
  }, [transition]);

  const minimizeToBubble = useCallback(() => {
    transition('minimized');
  }, [transition]);

  return {
    viewState,
    isTransitioning,
    expandToHalf,
    expandToFull,
    openChat,
    closeChat,
    minimizeToHalf,
    minimizeToBubble,
  };
}
