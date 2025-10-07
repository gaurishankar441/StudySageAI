import { Loader2, Brain, FileText, Video, Globe, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export type LoadingContext = 
  | "doc_upload" 
  | "youtube_upload" 
  | "web_upload" 
  | "ai_thinking" 
  | "processing" 
  | "quiz_generation"
  | "note_generation"
  | "general";

interface LoadingScreenProps {
  context?: LoadingContext;
  message?: string;
  fullScreen?: boolean;
}

const loadingMessages: Record<LoadingContext, { icon: React.ComponentType<any>; text: string; subtext: string }> = {
  doc_upload: {
    icon: FileText,
    text: "AI ke dimag me document daal raha hai...",
    subtext: "Har page ko samajh raha hai ✨"
  },
  youtube_upload: {
    icon: Video,
    text: "Video transcript extract kar raha hai...",
    subtext: "Har second ko text me convert kar raha hai 🎬"
  },
  web_upload: {
    icon: Globe,
    text: "Web page content analyze kar raha hai...",
    subtext: "Saari important information nikal raha hai 🌐"
  },
  ai_thinking: {
    icon: Brain,
    text: "AI soch raha hai...",
    subtext: "Best response tayyar kar raha hai 🧠"
  },
  quiz_generation: {
    icon: Sparkles,
    text: "Quiz questions bana raha hai...",
    subtext: "Interesting questions generate ho rahe hain 📝"
  },
  note_generation: {
    icon: Sparkles,
    text: "Smart notes bana raha hai...",
    subtext: "Key points organize kar raha hai 📚"
  },
  processing: {
    icon: Loader2,
    text: "Data process ho raha hai...",
    subtext: "Thoda wait karo, almost ready hai ⚙️"
  },
  general: {
    icon: Loader2,
    text: "Loading...",
    subtext: "Please wait"
  }
};

export default function LoadingScreen({ 
  context = "general", 
  message,
  fullScreen = true 
}: LoadingScreenProps) {
  const config = loadingMessages[context];
  const Icon = config.icon;

  const containerClass = fullScreen
    ? "fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-lg"
    : "flex items-center justify-center py-12";

  // Context-specific animations
  const getIconAnimation = () => {
    switch (context) {
      case "ai_thinking":
        return { 
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        };
      case "doc_upload":
      case "youtube_upload":
      case "web_upload":
        return {
          y: [0, -10, 0],
          scale: [1, 1.1, 1]
        };
      case "quiz_generation":
      case "note_generation":
        return {
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0]
        };
      default:
        return {
          scale: [1, 1.1, 1]
        };
    }
  };

  const getIconTransition = () => {
    switch (context) {
      case "ai_thinking":
        return {
          rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        };
      default:
        return {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        };
    }
  };

  return (
    <div className={containerClass} data-testid="loading-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative p-8 max-w-md w-full mx-4 text-center rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl"
      >
        {/* Gradient Glow Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 animate-pulse-subtle" />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Animated Icon with Enhanced Effects */}
          <motion.div
            animate={getIconAnimation()}
            transition={getIconTransition()}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-lg"
          >
            <Icon className="w-10 h-10 text-white" />
          </motion.div>

          {/* Main Message with Gradient Text */}
          <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            {message || config.text}
          </h3>

          {/* Subtext */}
          <p className="text-sm text-muted-foreground mb-6">
            {config.subtext}
          </p>

          {/* Modern Animated Progress Bar */}
          <div className="relative h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
              animate={{
                x: ["-100%", "100%"]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ width: "50%" }}
            />
          </div>

          {/* Animated Progress Dots */}
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
