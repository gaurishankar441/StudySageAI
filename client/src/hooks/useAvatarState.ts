/**
 * 🎭 Avatar State Machine Hook
 * Manages avatar lifecycle with 5-state FSM
 * Syncs state with server via WebSocket
 */

import { useState, useCallback, useMemo } from 'react';

export type AvatarState = 
  | 'CLOSED'      // Avatar not visible/loaded
  | 'LOADING'     // Unity initializing
  | 'READY'       // Ready for TTS playback
  | 'PLAYING'     // Currently speaking
  | 'ERROR';      // Error state

interface StateTransitionLog {
  from: AvatarState;
  to: AvatarState;
  timestamp: number;
}

interface UseAvatarStateReturn {
  state: AvatarState;
  transition: (newState: AvatarState) => boolean;
  canAcceptTTS: boolean;
  history: StateTransitionLog[];
  reset: () => void;
}

// Valid state transitions (FSM rules)
const VALID_TRANSITIONS: Record<AvatarState, AvatarState[]> = {
  CLOSED: ['LOADING'],
  LOADING: ['READY', 'ERROR'],
  READY: ['PLAYING', 'CLOSED', 'ERROR'],
  PLAYING: ['READY', 'CLOSED', 'ERROR'],
  ERROR: ['LOADING', 'CLOSED']
};

/**
 * Avatar State Machine Hook
 * Manages state transitions with validation and WebSocket sync
 */
export function useAvatarState(): UseAvatarStateReturn {
  const [state, setState] = useState<AvatarState>('CLOSED');
  const [history, setHistory] = useState<StateTransitionLog[]>([]);

  /**
   * Validate if transition is allowed
   */
  const isValidTransition = useCallback((from: AvatarState, to: AvatarState): boolean => {
    return VALID_TRANSITIONS[from].includes(to);
  }, []);

  /**
   * Transition to new state with validation
   */
  const transition = useCallback((newState: AvatarState): boolean => {
    // Validate transition
    if (!isValidTransition(state, newState)) {
      console.error('[Avatar State] ❌ Invalid transition:', {
        from: state,
        to: newState,
        allowed: VALID_TRANSITIONS[state]
      });
      return false;
    }

    // Log transition
    const transitionLog: StateTransitionLog = {
      from: state,
      to: newState,
      timestamp: Date.now()
    };

    console.log('[Avatar State] ✅ Transition:', {
      from: state,
      to: newState
    });

    // Update state
    setState(newState);
    setHistory(prev => [...prev.slice(-9), transitionLog]); // Keep last 10 transitions

    // Notify server via WebSocket (if WS available)
    notifyServerStateChange(newState);

    return true;
  }, [state, isValidTransition]);

  /**
   * Check if avatar can accept TTS
   */
  const canAcceptTTS = useMemo(() => {
    return state === 'READY' || state === 'PLAYING';
  }, [state]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    console.log('[Avatar State] 🔄 Reset to CLOSED');
    setState('CLOSED');
    setHistory([]);
  }, []);

  return {
    state,
    transition,
    canAcceptTTS,
    history,
    reset
  };
}

/**
 * Notify server about avatar state change via WebSocket
 */
function notifyServerStateChange(state: AvatarState): void {
  // Check if WebSocket is available (will be injected by useVoiceTutor)
  const wsService = (window as any).__wsService;
  
  if (!wsService || !wsService.send) {
    console.warn('[Avatar State] ⚠️ WebSocket not available for state sync');
    return;
  }

  const canAcceptTTS = state === 'READY' || state === 'PLAYING';

  const message = {
    type: 'AVATAR_STATE',
    state,
    canAcceptTTS,
    timestamp: Date.now()
  };

  console.log('[Avatar State] 📤 Sending to server:', message);

  try {
    wsService.send(JSON.stringify(message));
  } catch (error) {
    console.error('[Avatar State] ❌ Failed to send state:', error);
  }
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: AvatarState): string {
  const descriptions: Record<AvatarState, string> = {
    CLOSED: 'Avatar is closed',
    LOADING: 'Loading Unity avatar...',
    READY: 'Avatar ready for interaction',
    PLAYING: 'Avatar is speaking',
    ERROR: 'Avatar encountered an error'
  };

  return descriptions[state];
}

/**
 * Get state color for UI
 */
export function getStateColor(state: AvatarState): string {
  const colors: Record<AvatarState, string> = {
    CLOSED: 'gray',
    LOADING: 'yellow',
    READY: 'green',
    PLAYING: 'blue',
    ERROR: 'red'
  };

  return colors[state];
}
