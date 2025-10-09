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

  // Position global Unity to match current view state
  useEffect(() => {
    const globalUnity = document.getElementById('global-unity-instance');
    const globalContainer = document.getElementById('global-unity-container');
    
    if (!globalUnity || !globalContainer) {
      console.warn('[Avatar] Global Unity not found!');
      return;
    }

    const isMobile = window.innerWidth < 768;
    
    if (viewState === 'minimized') {
      // Hide Unity
      (globalUnity as HTMLElement).style.opacity = '0';
      (globalUnity as HTMLElement).style.pointerEvents = 'none';
      (globalContainer as HTMLElement).style.pointerEvents = 'none';
      console.log('[Avatar] 👻 Unity hidden (minimized)');
      
    } else if (viewState === 'half') {
      // Position for Half Panel
      (globalUnity as HTMLElement).style.opacity = '1';
      (globalUnity as HTMLElement).style.pointerEvents = 'auto';
      (globalContainer as HTMLElement).style.pointerEvents = 'auto';
      
      if (isMobile) {
        // Mobile: Bottom 60vh
        (globalContainer as HTMLElement).style.top = 'auto';
        (globalContainer as HTMLElement).style.bottom = '0';
        (globalContainer as HTMLElement).style.left = '0';
        (globalContainer as HTMLElement).style.right = '0';
        (globalContainer as HTMLElement).style.height = '60vh';
        (globalContainer as HTMLElement).style.width = '100%';
      } else {
        // Desktop: Right panel 480px wide
        (globalContainer as HTMLElement).style.top = '0';
        (globalContainer as HTMLElement).style.bottom = '0';
        (globalContainer as HTMLElement).style.right = '0';
        (globalContainer as HTMLElement).style.left = 'auto';
        (globalContainer as HTMLElement).style.width = '480px';
        (globalContainer as HTMLElement).style.height = '100%';
      }
      console.log('[Avatar] ✅ Unity positioned for Half Panel');
      
    } else if (viewState === 'fullscreen' || viewState === 'fullscreen-chat') {
      // Position for Fullscreen
      (globalUnity as HTMLElement).style.opacity = '1';
      (globalUnity as HTMLElement).style.pointerEvents = 'auto';
      (globalContainer as HTMLElement).style.pointerEvents = 'auto';
      
      (globalContainer as HTMLElement).style.top = '0';
      (globalContainer as HTMLElement).style.bottom = '0';
      (globalContainer as HTMLElement).style.left = '0';
      (globalContainer as HTMLElement).style.right = '0';
      (globalContainer as HTMLElement).style.width = '100%';
      (globalContainer as HTMLElement).style.height = '100%';
      
      console.log(`[Avatar] ✅ Unity positioned for ${viewState}`);
    }
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
