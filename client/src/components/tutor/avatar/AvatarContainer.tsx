import { AnimatePresence } from 'framer-motion';
import { useAvatarViewState } from './hooks/useAvatarViewState';
import { MinimizedBubble } from './states/MinimizedBubble';
import { HalfPanel } from './states/HalfPanel';
import { FullscreenPanel } from './states/FullscreenPanel';
import { FullscreenWithChat } from './states/FullscreenWithChat';

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
        )}

        {/* STATE 3: Fullscreen */}
        {viewState === 'fullscreen' && (
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
        )}

        {/* STATE 4: Fullscreen with Chat */}
        {viewState === 'fullscreen-chat' && (
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
        )}
      </AnimatePresence>
    </div>
  );
}
