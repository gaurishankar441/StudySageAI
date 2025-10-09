import { motion } from 'framer-motion';
import { fullscreenVariants, chatPanelVariants } from '../animations/variants';
import { AvatarControls } from '../controls/AvatarControls';
import { BottomOverlay } from '../controls/BottomOverlay';
import { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnityAvatar } from '@/contexts/UnityAvatarContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface FullscreenWithChatProps {
  onClose: () => void;
  onMinimize: () => void;
  onCloseChat: () => void;
  onMicClick?: () => void;
  onReload?: () => void;
  isMicActive?: boolean;
  currentLanguage?: 'en' | 'hi';
  onLanguageToggle?: () => void;
  unityIframeUrl: string;
  messages: Message[];
  onSendMessage?: (message: string) => void;
  className?: string;
}

export function FullscreenWithChat({
  onClose,
  onMinimize,
  onCloseChat,
  onMicClick,
  onReload,
  isMicActive = false,
  currentLanguage = 'en',
  onLanguageToggle,
  unityIframeUrl,
  messages,
  onSendMessage,
  className = '',
}: FullscreenWithChatProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading, isReady, error } = useUnityAvatar();

  // Focus iframe when panel opens
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, []);

  const handleSendMessage = () => {
    if (inputRef.current && inputRef.current.value.trim()) {
      onSendMessage?.(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      variants={fullscreenVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`fixed inset-0 bg-black z-[10000] flex ${className}`}
      data-testid="avatar-fullscreen-chat"
    >
      {/* Avatar Section */}
      <div className="flex-1 relative md:w-3/5 w-full md:h-full h-[40vh]">
        {/* Control Bar (Floating) */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="text-white text-sm font-medium px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
            VaktaAI Avatar
          </div>
          <AvatarControls
            onClose={onClose}
            onReload={onReload}
            onMinimize={onMinimize}
            onLanguageToggle={onLanguageToggle}
            currentLanguage={currentLanguage}
            showExpand={false}
            showMinimize={true}
            showChat={false}
          />
        </div>

        {/* Unity Avatar Render Area */}
        <div 
          className="absolute inset-0 w-full h-full"
          data-testid="unity-avatar-container"
        >
          {/* Loading Screen */}
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 to-blue-900/90 flex flex-col items-center justify-center z-20">
              <Loader2 className="w-20 h-20 text-white animate-spin mb-4" />
              <p className="text-white text-2xl font-medium mb-2">Loading 3D Avatar...</p>
              <p className="text-white/70 text-base">This may take a few seconds (~28s)</p>
              <div className="mt-6 w-64 h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Error Screen */}
          {error && (
            <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-20 p-6">
              <div className="text-8xl mb-6">⚠️</div>
              <p className="text-white text-2xl font-medium mb-3">Avatar Loading Failed</p>
              <p className="text-white/80 text-base text-center max-w-lg">{error}</p>
              <button
                onClick={onReload}
                className="mt-6 px-8 py-3 bg-white text-red-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Reload Avatar
              </button>
            </div>
          )}

          {/* Unity Target Container */}
          <div 
            id="fullscreen-chat-unity-target" 
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 1 }}
          />
        </div>

        {/* Bottom Overlay (Mic only, no chat button) */}
        <BottomOverlay
          avatarName="VaktaAI Tutor"
          onMicClick={onMicClick}
          isMicActive={isMicActive}
        />
      </div>

      {/* Chat Panel */}
      <motion.div
        variants={chatPanelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="md:w-2/5 w-full md:h-full h-[60vh] bg-gray-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col"
        data-testid="chat-panel"
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold">Chat</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCloseChat}
            className="h-8 w-8 rounded-full text-white hover:bg-white/10"
            data-testid="button-close-chat-panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages-list">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`message-${message.id}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Box */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your message here..."
              onKeyPress={handleKeyPress}
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSendMessage}
              className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4"
              data-testid="button-send-message"
            >
              Send
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
