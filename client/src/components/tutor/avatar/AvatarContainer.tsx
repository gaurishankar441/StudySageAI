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

  // Move global Unity instance into active state container
  useEffect(() => {
    console.log(`[Avatar Container] 🔍 viewState changed to: ${viewState}`);
    
    // Wait for DOM to be ready
    const timer = setTimeout(() => {
      // Use querySelector to find Unity element anywhere in DOM (more reliable than getElementById)
      const globalUnity = document.querySelector('#global-unity-instance') as HTMLElement;
      
      console.log('[Avatar Container] Global Unity element:', globalUnity ? 'FOUND ✅' : 'NOT FOUND ❌');
      
      if (!globalUnity) {
        console.error('[Avatar] ❌ Global Unity instance not found!');
        return;
      }

      // Find target container based on viewState
      let targetContainer: HTMLElement | null = null;
      let targetId = '';
      
      if (viewState === 'half') {
        targetId = 'half-panel-unity-target';
        targetContainer = document.getElementById(targetId);
      } else if (viewState === 'fullscreen') {
        targetId = 'fullscreen-unity-target';
        targetContainer = document.getElementById(targetId);
      } else if (viewState === 'fullscreen-chat') {
        targetId = 'fullscreen-chat-unity-target';
        targetContainer = document.getElementById(targetId);
      }

      console.log(`[Avatar Container] Target container (#${targetId}):`, targetContainer ? 'FOUND ✅' : 'NOT FOUND ❌');

      if (targetContainer && !targetContainer.contains(globalUnity)) {
        // Remove hidden class and make Unity visible
        globalUnity.classList.remove('hidden');
        globalUnity.classList.add('block', 'w-full', 'h-full');
        
        // Move Unity into the target container
        targetContainer.appendChild(globalUnity);
        console.log(`[Avatar] ✅ Unity moved to ${viewState} container (#${targetId})`);
      } else if (targetContainer && targetContainer.contains(globalUnity)) {
        console.log(`[Avatar] ⚡ Unity already in ${viewState} container`);
      } else if (viewState === 'minimized') {
        // Hide Unity and move back to global container
        globalUnity.classList.add('hidden');
        globalUnity.classList.remove('block', 'w-full', 'h-full');
        
        const globalContainer = document.getElementById('global-unity-container');
        if (globalContainer && !globalContainer.contains(globalUnity)) {
          globalContainer.appendChild(globalUnity);
          console.log('[Avatar] 👻 Unity moved to hidden container (minimized)');
        }
      } else {
        console.warn(`[Avatar] ⚠️ No valid target container for viewState: ${viewState}`);
      }
    }, 150); // Small delay for AnimatePresence

    return () => clearTimeout(timer);
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
