import { motion } from 'framer-motion';
import { halfPanelVariants, halfPanelMobileVariants, backdropVariants } from '../animations/variants';
import { AvatarControls } from '../controls/AvatarControls';
import { BottomOverlay } from '../controls/BottomOverlay';
import { useEffect, useRef } from 'react';

interface HalfPanelProps {
  onClose: () => void;
  onExpand: () => void;
  onChatClick: () => void;
  onMicClick?: () => void;
  onReload?: () => void;
  isMicActive?: boolean;
  currentLanguage?: 'en' | 'hi';
  onLanguageToggle?: () => void;
  unityIframeUrl: string;
  className?: string;
}

export function HalfPanel({
  onClose,
  onExpand,
  onChatClick,
  onMicClick,
  onReload,
  isMicActive = false,
  currentLanguage = 'en',
  onLanguageToggle,
  unityIframeUrl,
  className = '',
}: HalfPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Focus iframe when panel opens
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, []);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
        data-testid="avatar-backdrop"
      />

      {/* Panel */}
      <motion.div
        variants={window.innerWidth < 768 ? halfPanelMobileVariants : halfPanelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`fixed z-[9999] bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl shadow-2xl
          md:right-0 md:bottom-0 md:top-0 md:w-[480px] md:rounded-l-2xl
          bottom-0 left-0 right-0 h-[60vh] rounded-t-2xl
          ${className}`}
        data-testid="avatar-half-panel"
      >
        {/* Control Bar */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-sm flex items-center justify-between px-4 z-10 md:rounded-tl-2xl rounded-t-2xl">
          <div className="text-white text-sm font-medium">VaktaAI Avatar</div>
          <AvatarControls
            onClose={onClose}
            onReload={onReload}
            onExpand={onExpand}
            onLanguageToggle={onLanguageToggle}
            currentLanguage={currentLanguage}
            showExpand={true}
            showMinimize={false}
          />
        </div>

        {/* Unity Iframe */}
        <iframe
          ref={iframeRef}
          src={unityIframeUrl}
          className="absolute inset-0 w-full h-full border-0 rounded-2xl"
          allow="microphone; camera; autoplay"
          title="VaktaAI Unity Avatar"
          data-testid="unity-avatar-iframe"
        />

        {/* Bottom Overlay */}
        <BottomOverlay
          avatarName="VaktaAI Tutor"
          onMicClick={onMicClick}
          onChatClick={onChatClick}
          isMicActive={isMicActive}
        />
      </motion.div>
    </>
  );
}
