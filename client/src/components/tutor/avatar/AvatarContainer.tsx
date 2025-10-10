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

  // CRITICAL FIX: Don't move iframe, use dynamic positioning with getBoundingClientRect()
  useEffect(() => {
    console.log(`[Avatar Container] 🔍 viewState changed to: ${viewState}`);
    console.log('[Avatar Container] 🆕 CODE VERSION: 2025-10-10-FALLBACK-FIX');
    
    // CRITICAL: Position Unity function - called after DOM is ready
    const positionUnity = () => {
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
        // DYNAMIC POSITIONING: Get exact panel bounds from DOM
        const halfPanel = document.querySelector('[data-half-panel="true"]') as HTMLElement;
        
        if (halfPanel) {
          const rect = halfPanel.getBoundingClientRect();
          
          // CRITICAL FIX: Account for control bar height (48px = h-12)
          // Unity should fit EXACTLY in visible avatar area (below control bar)
          const controlBarHeight = 48;
          const unityTop = rect.top + controlBarHeight;
          const unityHeight = rect.height - controlBarHeight;
          
          // Match Unity container to visible avatar area ONLY
          globalUnityContainer.style.top = `${unityTop}px`;
          globalUnityContainer.style.left = `${rect.left}px`;
          globalUnityContainer.style.width = `${rect.width}px`;
          globalUnityContainer.style.height = `${unityHeight}px`;
          globalUnityContainer.style.bottom = 'auto';
          globalUnityContainer.style.right = 'auto';
          globalUnityContainer.style.borderRadius = window.innerWidth < 768 ? '0 0 1rem 1rem' : '0 0 0 1rem';
          globalUnityContainer.style.zIndex = '9999'; // ABOVE backdrop (9998), BELOW controls (10000)
          
          console.log(`[Avatar] ✅ Unity EXACT FIT - Top: ${unityTop}px (panel ${rect.top}px + control bar ${controlBarHeight}px), Height: ${unityHeight}px (panel ${rect.height}px - ${controlBarHeight}px)`);
          
          // Update Unity position function
          const updateUnityPosition = () => {
            const newRect = halfPanel.getBoundingClientRect();
            const newUnityTop = newRect.top + controlBarHeight;
            const newUnityHeight = newRect.height - controlBarHeight;
            globalUnityContainer.style.top = `${newUnityTop}px`;
            globalUnityContainer.style.left = `${newRect.left}px`;
            globalUnityContainer.style.width = `${newRect.width}px`;
            globalUnityContainer.style.height = `${newUnityHeight}px`;
            console.log(`[Avatar] 🔄 Unity repositioned - Top: ${newUnityTop}px, Height: ${newUnityHeight}px (accounting for control bar)`);
          };
          
          // ResizeObserver for panel size changes
          const resizeObserver = new ResizeObserver(updateUnityPosition);
          resizeObserver.observe(halfPanel);
          
          // Window resize listener for position changes (when size stays same but position shifts)
          window.addEventListener('resize', updateUnityPosition);
          
          // Scroll listener for position changes during scroll
          window.addEventListener('scroll', updateUnityPosition);
          
          return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateUnityPosition);
            window.removeEventListener('scroll', updateUnityPosition);
          };
        } else {
          console.error('[Avatar] ❌ Half panel [data-half-panel] not found! Using FIXED fallback');
          
          // FIXED FALLBACK: Account for control bar (48px)
          // Panel: bottom-4 right-4 w-[480px] h-[60vh] (mobile) or full height (desktop)
          const controlBarHeight = 48;
          const isMobile = window.innerWidth < 768;
          const fallbackHeight = isMobile ? 'calc(60vh - 48px)' : 'calc(100vh - 48px)';
          
          globalUnityContainer.style.position = 'fixed';
          globalUnityContainer.style.bottom = isMobile ? '16px' : '0px';
          globalUnityContainer.style.right = isMobile ? '16px' : '0px';
          globalUnityContainer.style.top = 'auto';
          globalUnityContainer.style.left = isMobile ? '0px' : 'auto';
          globalUnityContainer.style.width = isMobile ? '100%' : '480px';
          globalUnityContainer.style.height = fallbackHeight;  // Account for control bar!
          globalUnityContainer.style.zIndex = '9999';
          globalUnityContainer.style.borderRadius = isMobile ? '0 0 1rem 1rem' : '0 0 0 1rem';
          globalUnityContainer.style.overflow = 'hidden';
          
          console.log(`[Avatar] ✅ Unity FALLBACK - Height: ${fallbackHeight} (accounting for ${controlBarHeight}px control bar)`);
        }
        
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
    };
    
    // CRITICAL FIX: Increase delay 100ms → 200ms to let React render HalfPanel completely
    const timeout = setTimeout(positionUnity, 200);
    
    return () => clearTimeout(timeout);
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
