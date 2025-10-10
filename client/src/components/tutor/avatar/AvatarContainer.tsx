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

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('[Avatar Container] 🎭 Component mounted! Initial viewState:', viewState);
  }, []);

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

  // CRITICAL FIX: Don't move iframe, just show/hide with CSS - properly integrated with panels
  useEffect(() => {
    console.log(`[Avatar Container] 🔍 viewState changed to: ${viewState}`);
    console.log('[Avatar Container] 🆕 CODE VERSION: 2025-10-10-PANEL-INTEGRATED-V4');
    
    // Find global Unity container (iframe stays here always!)
    const globalUnityContainer = document.getElementById('global-unity-container');
    
    if (!globalUnityContainer) {
      console.error('[Avatar] ❌ Global Unity container not found!');
      return;
    }
    
    // IMPORTANT: Hide Unity when minimized - bubble handles the view
    if (viewState === 'minimized') {
      globalUnityContainer.style.display = 'none';
      console.log('[Avatar] 👻 Unity HIDDEN (minimized - bubble shows instead)');
      return;
    }
    
    // Show Unity and position it to match the panel - WITH interactions enabled
    globalUnityContainer.style.display = 'block';
    globalUnityContainer.style.position = 'fixed';
    globalUnityContainer.style.pointerEvents = 'auto'; // ENABLE Unity interactions!
    globalUnityContainer.style.overflow = 'hidden'; // Clip to bounds
    
    if (viewState === 'half') {
      // Half panel: Match EXACT panel dimensions
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Mobile: Bottom sheet (60vh from bottom)
        globalUnityContainer.style.width = '100%';
        globalUnityContainer.style.height = '60vh';
        globalUnityContainer.style.bottom = '0';
        globalUnityContainer.style.left = '0';
        globalUnityContainer.style.top = 'auto';
        globalUnityContainer.style.right = 'auto';
        globalUnityContainer.style.borderRadius = '1rem 1rem 0 0'; // rounded-t-2xl
      } else {
        // Desktop: Right panel (full height, 480px wide)
        globalUnityContainer.style.width = '480px';
        globalUnityContainer.style.height = '100vh'; // Full height on desktop
        globalUnityContainer.style.right = '0';
        globalUnityContainer.style.top = '0';
        globalUnityContainer.style.bottom = 'auto';
        globalUnityContainer.style.left = 'auto';
        globalUnityContainer.style.borderRadius = '1rem 0 0 1rem'; // rounded-l-2xl
      }
      globalUnityContainer.style.zIndex = '9990'; // BELOW controls (controls are 10000+)
      console.log('[Avatar] ✅ Unity positioned for HALF panel (pointer-events enabled)');
      
    } else if (viewState === 'fullscreen') {
      // Fullscreen: Cover entire viewport
      globalUnityContainer.style.width = '100vw';
      globalUnityContainer.style.height = '100vh';
      globalUnityContainer.style.top = '0';
      globalUnityContainer.style.left = '0';
      globalUnityContainer.style.bottom = 'auto';
      globalUnityContainer.style.right = 'auto';
      globalUnityContainer.style.borderRadius = '0';
      globalUnityContainer.style.zIndex = '9990'; // BELOW controls
      console.log('[Avatar] ✅ Unity positioned for FULLSCREEN');
      
    } else if (viewState === 'fullscreen-chat') {
      // Fullscreen with chat: Avatar takes left portion, chat panel right
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Mobile: Avatar top 40%, chat bottom 60%
        globalUnityContainer.style.width = '100%';
        globalUnityContainer.style.height = '40vh';
        globalUnityContainer.style.top = '0';
        globalUnityContainer.style.left = '0';
      } else {
        // Desktop: Avatar 60% left (3/5), chat 40% right (2/5)
        globalUnityContainer.style.width = '60vw';
        globalUnityContainer.style.height = '100vh';
        globalUnityContainer.style.top = '0';
        globalUnityContainer.style.left = '0';
      }
      globalUnityContainer.style.bottom = 'auto';
      globalUnityContainer.style.right = 'auto';
      globalUnityContainer.style.borderRadius = '0';
      globalUnityContainer.style.zIndex = '9990'; // BELOW all controls
      console.log('[Avatar] ✅ Unity positioned for FULLSCREEN-CHAT');
    }
    
  }, [viewState]);

  return (
    <div className={`avatar-container ${className}`} data-testid="avatar-container">
      <AnimatePresence mode="wait">
        {/* STATE 1: Minimized Bubble */}
        {viewState === 'minimized' && (
          <MinimizedBubble
            key="minimized"
            onClick={() => {
              console.log('[Avatar Container] 🔘 Bubble clicked! Expanding to half...');
              expandToHalf();
            }}
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
