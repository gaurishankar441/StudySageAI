import { Brain, Sparkles } from "lucide-react";

interface TypingIndicatorProps {
  variant?: "default" | "ai" | "sparkle";
  message?: string;
  className?: string;
}

export function TypingIndicator({ 
  variant = "default", 
  message = "AI soch raha hai...",
  className = "" 
}: TypingIndicatorProps) {
  const Icon = variant === "sparkle" ? Sparkles : Brain;
  
  return (
    <div className={`flex items-center gap-3 animate-fade-in ${className}`} data-testid="typing-indicator">
      {/* Icon with Gradient Background */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
        <Icon className="w-5 h-5 text-white animate-pulse" />
      </div>
      
      {/* Message Container with Glassmorphism */}
      <div className="flex-1">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border border-indigo-200/50 dark:border-indigo-800/50 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Animated Dots */}
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-typing-dot-1" />
              <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-typing-dot-2" />
              <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-typing-dot-3" />
            </div>
            
            {/* Message Text */}
            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact variant for inline use with glassmorphism
export function TypingIndicatorCompact({ message = "Typing..." }: { message?: string }) {
  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/30 backdrop-blur-sm border border-indigo-200/30 dark:border-indigo-800/30" 
      data-testid="typing-indicator-compact"
    >
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-typing-dot-1" />
        <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-typing-dot-2" />
        <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-typing-dot-3" />
      </div>
      <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{message}</span>
    </div>
  );
}
