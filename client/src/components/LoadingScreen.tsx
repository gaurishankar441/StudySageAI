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
    ? "fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-md"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClass} data-testid="loading-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 max-w-md w-full mx-4 text-center"
      >
        {/* Animated Icon */}
        <motion.div
          animate={{ 
            rotate: context === "ai_thinking" ? [0, 360] : 0,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-6"
        >
          <Icon className="w-10 h-10 text-white" />
        </motion.div>

        {/* Main Message */}
        <h3 className="text-xl font-semibold mb-2 gradient-text">
          {message || config.text}
        </h3>

        {/* Subtext */}
        <p className="text-sm text-muted-foreground mb-6">
          {config.subtext}
        </p>

        {/* Animated Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2 h-2 rounded-full bg-gradient-primary"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
