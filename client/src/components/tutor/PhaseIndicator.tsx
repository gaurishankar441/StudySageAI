import { CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PhaseIndicatorProps {
  currentPhase: number;
  totalPhases?: number;
}

const PHASE_NAMES = [
  "Greeting",
  "Rapport",
  "Assessment", 
  "Teaching",
  "Practice",
  "Feedback",
  "Closure"
];

export default function PhaseIndicator({ currentPhase, totalPhases = 7 }: PhaseIndicatorProps) {
  const progressPercent = ((currentPhase - 1) / (totalPhases - 1)) * 100;
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4" data-testid="phase-indicator">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Learning Phase</span>
          <span className="text-sm font-semibold text-primary" data-testid="text-phase-number">
            {currentPhase} of {totalPhases}
          </span>
        </div>
        <span className="text-sm font-medium text-foreground" data-testid="text-phase-name">
          {PHASE_NAMES[currentPhase - 1] || "Unknown"}
        </span>
      </div>
      
      <Progress value={progressPercent} className="h-2 mb-3" data-testid="progress-phase" />
      
      <div className="flex justify-between gap-1">
        {PHASE_NAMES.map((phase, index) => {
          const phaseNumber = index + 1;
          const isComplete = phaseNumber < currentPhase;
          const isCurrent = phaseNumber === currentPhase;
          
          return (
            <div 
              key={phase}
              className="flex flex-col items-center flex-1"
              data-testid={`phase-step-${phaseNumber}`}
            >
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center mb-1 transition-colors
                ${isComplete ? 'bg-primary text-primary-foreground' : 
                  isCurrent ? 'bg-primary/20 text-primary border-2 border-primary' : 
                  'bg-muted text-muted-foreground'}
              `}>
                {isComplete ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-medium">{phaseNumber}</span>
                )}
              </div>
              <span className={`
                text-[10px] text-center leading-tight hidden sm:block
                ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}
              `}>
                {phase}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
