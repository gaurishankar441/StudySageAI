import { motion } from 'framer-motion';
import { X, RotateCw, Maximize2, Minimize2, Globe, Settings, MessageCircle } from 'lucide-react';
import { controlsVariants, controlButtonVariants } from '../animations/variants';
import { Button } from '@/components/ui/button';

interface AvatarControlsProps {
  onClose?: () => void;
  onReload?: () => void;
  onExpand?: () => void;
  onMinimize?: () => void;
  onToggleChat?: () => void;
  onLanguageToggle?: () => void;
  onSettings?: () => void;
  showExpand?: boolean;
  showMinimize?: boolean;
  showChat?: boolean;
  currentLanguage?: 'en' | 'hi';
  className?: string;
}

export function AvatarControls({
  onClose,
  onReload,
  onExpand,
  onMinimize,
  onToggleChat,
  onLanguageToggle,
  onSettings,
  showExpand = true,
  showMinimize = false,
  showChat = false,
  currentLanguage = 'en',
  className = '',
}: AvatarControlsProps) {
  return (
    <motion.div
      variants={controlsVariants}
      initial="hidden"
      animate="visible"
      className={`flex items-center gap-2 ${className}`}
      data-testid="avatar-controls"
    >
      {/* Close Button */}
      {onClose && (
        <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-black/40 hover:bg-red-500/80 text-white backdrop-blur-sm transition-colors"
            data-testid="button-close-avatar"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Reload Button */}
      {onReload && (
        <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="ghost"
            size="icon"
            onClick={onReload}
            className="h-8 w-8 rounded-full bg-black/40 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
            data-testid="button-reload-avatar"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Expand Button */}
      {showExpand && onExpand && (
        <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="ghost"
            size="icon"
            onClick={onExpand}
            className="h-8 w-8 rounded-full bg-black/40 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
            data-testid="button-expand-avatar"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Minimize Button */}
      {showMinimize && onMinimize && (
        <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="h-8 w-8 rounded-full bg-black/40 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
            data-testid="button-minimize-avatar"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Chat Button */}
      {showChat && onToggleChat && (
        <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleChat}
            className="h-8 w-8 rounded-full bg-black/40 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
            data-testid="button-toggle-chat"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Language Toggle */}
      {onLanguageToggle && (
        <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLanguageToggle}
            className="h-8 w-8 rounded-full bg-black/40 hover:bg-white/20 text-white backdrop-blur-sm transition-colors text-xs font-bold"
            data-testid="button-language-toggle"
          >
            {currentLanguage.toUpperCase()}
          </Button>
        </motion.div>
      )}

      {/* Settings Button */}
      {onSettings && (
        <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            className="h-8 w-8 rounded-full bg-black/40 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
