import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Loader2,
  Phone,
  PhoneOff 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceTutor } from '@/hooks/useVoiceTutor';

interface VoiceControlProps {
  chatId: string;
  onTranscription?: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function VoiceControl({ 
  chatId, 
  onTranscription,
  className,
  disabled 
}: VoiceControlProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const {
    state,
    startRecording,
    stopRecording,
    interrupt,
    isConnected,
    isRecording,
    isProcessing,
    isSpeaking,
  } = useVoiceTutor({
    chatId,
    onTranscription,
  });

  // Visualizer animation
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      if (isRecording || isSpeaking) {
        const barCount = 20;
        const barWidth = width / barCount;
        const time = Date.now() / 100;

        for (let i = 0; i < barCount; i++) {
          const barHeight = Math.sin(time + i * 0.5) * 20 + 30;
          const x = i * barWidth;
          const y = (height - barHeight) / 2;

          // Gradient for bars
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          if (isRecording) {
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)'); // red
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
          } else {
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)'); // indigo
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.3)');
          }

          ctx.fillStyle = gradient;
          ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isSpeaking]);

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (isSpeaking) {
      interrupt();
      setTimeout(() => startRecording(), 300);
    } else {
      startRecording();
    }
  };

  return (
    <Card className={cn(
      "glass-card border-indigo-200/50 dark:border-indigo-800/50",
      className
    )}>
      <div className="p-4 space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full transition-all",
              isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Voice Connected' : 'Connecting...'}
            </span>
          </div>

          {/* State indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* Visualizer */}
        <div className="relative">
          <canvas 
            ref={canvasRef}
            width={400}
            height={80}
            className="w-full h-20 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900/50 dark:to-indigo-900/20 rounded-lg"
          />
          
          {/* Center overlay text when idle */}
          {!isRecording && !isSpeaking && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Click mic to start voice conversation
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Main mic button */}
          <Button
            size="lg"
            onClick={handleMicClick}
            disabled={!isConnected || disabled}
            className={cn(
              "relative w-16 h-16 rounded-full transition-all",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                : isSpeaking
                ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                : "btn-gradient"
            )}
            data-testid="button-voice-mic"
          >
            {isRecording ? (
              <MicOff className="w-6 h-6" />
            ) : isSpeaking ? (
              <Volume2 className="w-6 h-6 animate-pulse" />
            ) : (
              <Mic className="w-6 h-6" />
            )}

            {/* Ripple effect when recording */}
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
            )}
          </Button>

          {/* Interrupt button (only when AI is speaking) */}
          {isSpeaking && (
            <Button
              size="sm"
              variant="outline"
              onClick={interrupt}
              className="gap-2"
              data-testid="button-voice-interrupt"
            >
              <VolumeX className="w-4 h-4" />
              Stop
            </Button>
          )}
        </div>

        {/* Status text */}
        <div className="text-center">
          {isRecording && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              🎤 Listening...
            </p>
          )}
          {isProcessing && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              🧠 Processing your question...
            </p>
          )}
          {isSpeaking && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              🔊 AI Tutor is speaking...
            </p>
          )}
          {!isRecording && !isProcessing && !isSpeaking && isConnected && (
            <p className="text-sm text-muted-foreground">
              Ready for voice input
            </p>
          )}
        </div>

        {/* Transcription display */}
        {state.transcription && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <p className="text-sm text-indigo-900 dark:text-indigo-100">
              <span className="font-semibold">You said:</span> {state.transcription}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
