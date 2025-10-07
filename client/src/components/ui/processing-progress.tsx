import { FileText, Scan, Database, CheckCircle, Brain } from "lucide-react";
import { motion } from "framer-motion";

type ProcessingStage = "uploading" | "chunking" | "embedding" | "storing" | "complete";

interface ProcessingProgressProps {
  stage: ProcessingStage;
  fileName?: string;
  className?: string;
}

const stages = [
  { id: "uploading", label: "Upload ho raha hai", icon: FileText },
  { id: "chunking", label: "Document chunks bana rahe hain", icon: Scan },
  { id: "embedding", label: "AI embeddings generate kar raha hai", icon: Brain },
  { id: "storing", label: "Vector database me store kar rahe hain", icon: Database },
  { id: "complete", label: "Document ready to chat! ✨", icon: CheckCircle },
];

export function ProcessingProgress({ stage, fileName, className = "" }: ProcessingProgressProps) {
  const currentStageIndex = stages.findIndex(s => s.id === stage);
  
  return (
    <div className={`max-w-2xl mx-auto ${className}`} data-testid="processing-progress">
      {/* File Name */}
      {fileName && (
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">Processing</p>
          <p className="font-medium gradient-text">{fileName}</p>
        </div>
      )}

      {/* Progress Stages */}
      <div className="space-y-4">
        {stages.map((stageItem, index) => {
          const Icon = stageItem.icon;
          const isActive = index === currentStageIndex;
          const isCompleted = index < currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <motion.div
              key={stageItem.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
                ${isActive ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-200 dark:border-indigo-800 shadow-md' : ''}
                ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50' : ''}
                ${isPending ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800' : ''}
              `}
              data-testid={`stage-${stageItem.id}`}
            >
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg' : ''}
                ${isCompleted ? 'bg-emerald-500' : ''}
                ${isPending ? 'bg-slate-300 dark:bg-slate-700' : ''}
              `}>
                {isActive ? (
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </motion.div>
                ) : (
                  <Icon className={`
                    w-5 h-5
                    ${isCompleted ? 'text-white' : 'text-slate-400 dark:text-slate-500'}
                  `} />
                )}
              </div>

              {/* Stage Label */}
              <div className="flex-1">
                <p className={`
                  text-sm font-medium
                  ${isActive ? 'text-indigo-700 dark:text-indigo-300' : ''}
                  ${isCompleted ? 'text-emerald-700 dark:text-emerald-300' : ''}
                  ${isPending ? 'text-muted-foreground' : ''}
                `}>
                  {stageItem.label}
                </p>
              </div>

              {/* Status Indicator */}
              {isActive && (
                <div className="flex gap-1">
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
                      className="w-1.5 h-1.5 rounded-full bg-indigo-600"
                    />
                  ))}
                </div>
              )}

              {isCompleted && (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Overall Progress Bar */}
      <div className="mt-6">
        <div className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>0%</span>
          <span>{Math.round(((currentStageIndex + 1) / stages.length) * 100)}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
