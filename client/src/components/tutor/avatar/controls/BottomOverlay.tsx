import { motion } from 'framer-motion';
import { Mic, MoreVertical, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlButtonVariants } from '../animations/variants';

interface BottomOverlayProps {
  avatarName?: string;
  onMicClick?: () => void;
  onMoreClick?: () => void;
  onChatClick?: () => void;
  isMicActive?: boolean;
  className?: string;
}

export function BottomOverlay({
  avatarName = 'VaktaAI Tutor',
  onMicClick,
  onMoreClick,
  onChatClick,
  isMicActive = false,
  className = '',
}: BottomOverlayProps) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-sm ${className}`}
      data-testid="avatar-bottom-overlay"
    >
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        {/* Avatar Name */}
        <div className="flex items-center gap-2">
          <div className="text-white font-medium text-sm" data-testid="text-avatar-name">
            {avatarName}
          </div>
          {isMicActive && (
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-green-400 text-xs font-medium">Recording</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mic Button */}
          {onMicClick && (
            <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMicClick}
                className={`h-12 w-12 rounded-full ${
                  isMicActive
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-white/20 hover:bg-white/30'
                } text-white backdrop-blur-sm transition-colors`}
                data-testid="button-mic"
              >
                <Mic className="h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* More Options */}
          {onMoreClick && (
            <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMoreClick}
                className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors"
                data-testid="button-more"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* Chat Button */}
          {onChatClick && (
            <motion.div variants={controlButtonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="ghost"
                size="icon"
                onClick={onChatClick}
                className="h-12 w-12 rounded-full bg-purple-500 hover:bg-purple-600 text-white backdrop-blur-sm transition-colors"
                data-testid="button-open-chat"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
