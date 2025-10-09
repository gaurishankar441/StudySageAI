import { motion } from 'framer-motion';
import { fullscreenVariants } from '../animations/variants';
import { AvatarControls } from '../controls/AvatarControls';
import { BottomOverlay } from '../controls/BottomOverlay';
import { useEffect, useRef } from 'react';
import { useUnityAvatar } from '@/contexts/UnityAvatarContext';
import { Loader2 } from 'lucide-react';

interface FullscreenPanelProps {
  onClose: () => void;
  onMinimize: () => void;
  onChatClick: () => void;
  onMicClick?: () => void;
  onReload?: () => void;
  isMicActive?: boolean;
  currentLanguage?: 'en' | 'hi';
  onLanguageToggle?: () => void;
  unityIframeUrl: string;
  className?: string;
}

export function FullscreenPanel({
  onClose,
  onMinimize,
  onChatClick,
  onMicClick,
  onReload,
  isMicActive = false,
  currentLanguage = 'en',
  onLanguageToggle,
  unityIframeUrl,
  className = '',
}: FullscreenPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { isLoading, isReady, error } = useUnityAvatar();

  // Focus iframe when panel opens
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, []);

  // Handle ESC key to minimize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onMinimize();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMinimize]);

  return (
    <motion.div
      variants={fullscreenVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`fixed inset-0 bg-black z-[10000] ${className}`}
      data-testid="avatar-fullscreen-panel"
    >
      {/* Control Bar (Floating) */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="text-white text-sm font-medium px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
          VaktaAI Avatar
        </div>
        <AvatarControls
          onClose={onClose}
          onReload={onReload}
          onMinimize={onMinimize}
          onToggleChat={onChatClick}
          onLanguageToggle={onLanguageToggle}
          currentLanguage={currentLanguage}
          showExpand={false}
          showMinimize={true}
          showChat={true}
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
          id="fullscreen-unity-target" 
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 1 }}
        />
      </div>

      {/* Bottom Overlay */}
      <BottomOverlay
        avatarName="VaktaAI Tutor"
        onMicClick={onMicClick}
        onChatClick={onChatClick}
        isMicActive={isMicActive}
      />
    </motion.div>
  );
}
