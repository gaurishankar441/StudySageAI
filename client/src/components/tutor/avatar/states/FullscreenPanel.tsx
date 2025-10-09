import { motion } from 'framer-motion';
import { fullscreenVariants } from '../animations/variants';
import { AvatarControls } from '../controls/AvatarControls';
import { BottomOverlay } from '../controls/BottomOverlay';
import { useEffect, useRef } from 'react';

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

      {/* Global Unity Instance (Reused) */}
      <div 
        className="absolute inset-0 w-full h-full"
        data-testid="unity-avatar-container"
      >
        {/* Unity will be shown here via global instance */}
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
