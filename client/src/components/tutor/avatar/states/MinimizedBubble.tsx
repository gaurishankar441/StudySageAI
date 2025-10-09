import { motion, AnimatePresence } from 'framer-motion';
import { bubbleVariants, pulseRingVariants } from '../animations/variants';

interface MinimizedBubbleProps {
  onClick: () => void;
  isSpeaking?: boolean;
  avatarImageUrl?: string;
  className?: string;
}

export function MinimizedBubble({
  onClick,
  isSpeaking = false,
  avatarImageUrl,
  className = '',
}: MinimizedBubbleProps) {
  return (
    <motion.div
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover="hover"
      onClick={onClick}
      className={`fixed bottom-6 right-6 cursor-pointer z-[9999] ${className}`}
      data-testid="avatar-minimized-bubble"
    >
      {/* Pulse Ring (when speaking) */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            variants={pulseRingVariants}
            initial="idle"
            animate="speaking"
            exit="idle"
            className="absolute inset-0 rounded-xl border-4 border-purple-400"
            style={{ transformOrigin: 'center' }}
          />
        )}
      </AnimatePresence>

      {/* Avatar Bubble */}
      <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 shadow-2xl shadow-purple-500/50 overflow-hidden">
        {/* Avatar Image or Placeholder */}
        {avatarImageUrl ? (
          <img
            src={avatarImageUrl}
            alt="VaktaAI Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 md:w-16 md:h-16 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}

        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="absolute bottom-2 right-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">Click to open</span>
        </div>
      </div>
    </motion.div>
  );
}
