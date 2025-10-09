import { AnimatePresence } from 'framer-motion';
import { useAvatarViewState } from './hooks/useAvatarViewState';
import { MinimizedBubble } from './states/MinimizedBubble';
import { HalfPanel } from './states/HalfPanel';
import { FullscreenPanel } from './states/FullscreenPanel';
import { FullscreenWithChat } from './states/FullscreenWithChat';
import { useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface AvatarContainerProps {
  messages: Message[];
  onSendMessage?: (message: string) => void;
  onMicClick?: () => void;
  isMicActive?: boolean;
  currentLanguage?: 'en' | 'hi';
  onLanguageToggle?: () => void;
  isSpeaking?: boolean;
  className?: string;
}

export function AvatarContainer({
  messages,
  onSendMessage,
  onMicClick,
  isMicActive = false,
  currentLanguage = 'en',
  onLanguageToggle,
  isSpeaking = false,
  className = '',
}: AvatarContainerProps) {
  const {
    viewState,
    expandToHalf,
    expandToFull,
    openChat,
    closeChat,
    minimizeToHalf,
    minimizeToBubble,
  } = useAvatarViewState('minimized');

  // Unity iframe URL
  const unityIframeUrl = '/unity-avatar/index.html';

  // Handle reload
  const handleReload = () => {
    window.location.reload();
  };

  // Handle close from any state
  const handleClose = () => {
    minimizeToBubble();
  };

  // Position global Unity instance based on view state
  useEffect(() => {
    const globalUnity = document.getElementById('global-unity-instance');
    const containerClass = 'unity-avatar-container';
    
    if (!globalUnity) {
      console.warn('[Avatar] Global Unity instance not found!');
      return;
    }

    // Find the active container
    const activeContainer = document.querySelector(`.${viewState} [data-testid="unity-avatar-container"]`);
    
    if (activeContainer && viewState !== 'minimized') {
      // Show Unity and move it to active container
      globalUnity.style.opacity = '1';
      globalUnity.style.pointerEvents = 'auto';
      activeContainer.appendChild(globalUnity);
      console.log(`[Avatar] Unity moved to ${viewState} state`);
    } else {
      // Hide Unity when minimized
      globalUnity.style.opacity = '0';
      globalUnity.style.pointerEvents = 'none';
      // Move back to global container
      const globalContainer = document.getElementById('global-unity-instance')?.parentElement;
      if (globalContainer && !globalContainer.contains(globalUnity)) {
        globalContainer.appendChild(globalUnity);
      }
    }

    return () => {
      // Cleanup on unmount - move Unity back to global container
      if (globalUnity) {
        globalUnity.style.opacity = '0';
        globalUnity.style.pointerEvents = 'none';
        const globalContainer = document.getElementById('global-unity-instance')?.parentElement;
        if (globalContainer && !globalContainer.contains(globalUnity)) {
          globalContainer.appendChild(globalUnity);
        }
      }
    };
  }, [viewState]);

  return (
    <div className={`avatar-container ${className}`} data-testid="avatar-container">
      <AnimatePresence mode="wait">
        {/* STATE 1: Minimized Bubble */}
        {viewState === 'minimized' && (
          <MinimizedBubble
            key="minimized"
            onClick={expandToHalf}
            isSpeaking={isSpeaking}
          />
        )}

        {/* STATE 2: Half Panel */}
        {viewState === 'half' && (
          <div className="half">
            <HalfPanel
              key="half"
              onClose={minimizeToBubble}
              onExpand={expandToFull}
              onChatClick={openChat}
              onMicClick={onMicClick}
              onReload={handleReload}
              isMicActive={isMicActive}
              currentLanguage={currentLanguage}
              onLanguageToggle={onLanguageToggle}
              unityIframeUrl={unityIframeUrl}
            />
          </div>
        )}

        {/* STATE 3: Fullscreen */}
        {viewState === 'fullscreen' && (
          <div className="fullscreen">
            <FullscreenPanel
              key="fullscreen"
              onClose={handleClose}
              onMinimize={minimizeToHalf}
              onChatClick={openChat}
              onMicClick={onMicClick}
              onReload={handleReload}
              isMicActive={isMicActive}
              currentLanguage={currentLanguage}
              onLanguageToggle={onLanguageToggle}
              unityIframeUrl={unityIframeUrl}
            />
          </div>
        )}

        {/* STATE 4: Fullscreen with Chat */}
        {viewState === 'fullscreen-chat' && (
          <div className="fullscreen-chat">
            <FullscreenWithChat
              key="fullscreen-chat"
              onClose={handleClose}
              onMinimize={minimizeToHalf}
              onCloseChat={closeChat}
              onMicClick={onMicClick}
              onReload={handleReload}
              isMicActive={isMicActive}
              currentLanguage={currentLanguage}
              onLanguageToggle={onLanguageToggle}
              unityIframeUrl={unityIframeUrl}
              messages={messages}
              onSendMessage={onSendMessage}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
