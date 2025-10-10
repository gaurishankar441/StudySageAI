import { motion } from 'framer-motion';
import { halfPanelVariants, halfPanelMobileVariants, backdropVariants } from '../animations/variants';
import { AvatarControls } from '../controls/AvatarControls';
import { BottomOverlay } from '../controls/BottomOverlay';
import { useEffect, useRef } from 'react';
import { useUnityAvatar } from '@/contexts/UnityAvatarContext';
import { Loader2 } from 'lucide-react';

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
  const { isLoading, isReady, error } = useUnityAvatar();

  // Debug: Log Unity avatar state
  useEffect(() => {
    console.log('[Half Panel] Unity state:', { isLoading, isReady, error });
  }, [isLoading, isReady, error]);

  // Focus iframe when panel opens
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, []);

  return (
    <>
      {/* Backdrop - pointer-events: none so Unity is clickable */}
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] pointer-events-none"
        data-testid="avatar-backdrop"
      />

      {/* Panel */}
      <motion.div
        variants={window.innerWidth < 768 ? halfPanelMobileVariants : halfPanelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`fixed z-[10000] pointer-events-none
          md:right-0 md:bottom-0 md:top-0 md:w-[480px]
          bottom-0 left-0 right-0 h-[60vh]
          ${className}`}
        data-testid="avatar-half-panel"
        data-half-panel="true"
      >
        {/* Control Bar */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-sm flex items-center justify-between px-4 z-10 md:rounded-tl-2xl rounded-t-2xl pointer-events-auto">
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

        {/* Unity rendered globally will appear behind this panel */}
        <div 
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden pointer-events-none"
          data-testid="unity-avatar-container"
        >
          {/* Loading Screen - Only show if Unity NOT ready */}
          {!isReady && !error && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 to-blue-900/90 flex flex-col items-center justify-center z-20 pointer-events-auto">
              <Loader2 className="w-16 h-16 text-white animate-spin mb-4" />
              <p className="text-white text-lg font-medium mb-2">Loading 3D Avatar...</p>
              <p className="text-white/70 text-sm">This may take a few seconds (~28s)</p>
              <div className="mt-4 w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Error Screen */}
          {error && (
            <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-20 p-6">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-white text-lg font-medium mb-2">Avatar Loading Failed</p>
              <p className="text-white/80 text-sm text-center max-w-md">{error}</p>
              <button
                onClick={onReload}
                className="mt-4 px-6 py-2 bg-white text-red-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Reload Avatar
              </button>
            </div>
          )}

        </div>

        {/* Bottom Overlay - with pointer events enabled for interactions */}
        <div className="pointer-events-auto">
          <BottomOverlay
            avatarName="VaktaAI Tutor"
            onMicClick={onMicClick}
            onChatClick={onChatClick}
            isMicActive={isMicActive}
          />
        </div>
      </motion.div>
    </>
  );
}
