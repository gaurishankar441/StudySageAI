import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import avatarPath from "@assets/ChatGPT Image Oct 7, 2025, 10_31_06 AM_1759813335869.png";

interface HeroSectionProps {
  onStartLearning: () => void;
  onWatchDemo: () => void;
}

export default function HeroSection({ onStartLearning, onWatchDemo }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-purple-600/15 animate-pulse-subtle pointer-events-none" />
      
      {/* Tech grid pattern background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(0deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Particle sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main content container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          
          {/* Left content - Text and CTAs */}
          <div className="flex-1 text-center lg:text-left space-y-8 order-2 lg:order-1">
            <div className="space-y-6 animate-fade-in-up stagger-1">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient">
                  Meet Your Personal
                </span>
                <br />
                <span className="text-white">AI Tutor</span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Learn from an AI companion that adapts to your pace, language & learning style
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up stagger-2">
              <Button
                onClick={onStartLearning}
                className="btn-gradient h-14 px-8 text-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300"
                data-testid="button-start-learning"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Learning Free
              </Button>
              
              <Button
                onClick={onWatchDemo}
                variant="outline"
                className="h-14 px-8 text-lg font-semibold border-2 border-slate-600 hover:border-cyan-400 hover:bg-cyan-400/10 text-white transition-all duration-300"
                data-testid="button-watch-demo"
              >
                Watch Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-400 animate-fade-in-up stagger-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-subtle" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse-subtle" />
                <span>Multilingual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse-subtle" />
                <span>Adaptive Learning</span>
              </div>
            </div>
          </div>

          {/* Right content - Holographic Avatar */}
          <div className="flex-1 flex justify-center items-center order-1 lg:order-2 animate-fade-in-up stagger-2">
            <div className="relative">
              {/* Pulsing glow rings */}
              <div className="absolute inset-0 -m-4 lg:-m-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 opacity-30 blur-3xl animate-pulse-glow" />
              </div>
              
              <div className="absolute inset-0 -m-2 lg:-m-4">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 opacity-20 blur-2xl animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
              </div>

              {/* Avatar container with floating animation */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 animate-float">
                {/* Holographic glow background */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 rounded-3xl opacity-40 blur-xl" />
                
                {/* Avatar image */}
                <div className="relative w-full h-full rounded-3xl overflow-hidden border-2 border-cyan-400/30 shadow-2xl shadow-cyan-500/50">
                  <img
                    src={avatarPath}
                    alt="Holographic AI Tutor Avatar"
                    className="w-full h-full object-cover"
                    data-testid="img-hero-avatar"
                  />
                  
                  {/* Holographic overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-transparent to-blue-600/20 mix-blend-overlay" />
                  
                  {/* Scan line effect */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-scan-line" />
                  </div>
                </div>

                {/* Floating particles around avatar */}
                <div className="absolute -inset-4 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-cyan-400 rounded-full opacity-60"
                      style={{
                        left: `${Math.cos((i * Math.PI * 2) / 8) * 50 + 50}%`,
                        top: `${Math.sin((i * Math.PI * 2) / 8) * 50 + 50}%`,
                        animation: `orbit ${3 + i * 0.5}s linear infinite`,
                        animationDelay: `${i * 0.2}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }

        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(0px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(0px) rotate(-360deg); }
        }

        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
