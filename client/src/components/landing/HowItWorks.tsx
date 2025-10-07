import { useEffect, useRef, useState } from "react";
import { Upload, Sparkles, GraduationCap, ArrowRight } from "lucide-react";
import avatarPath from "@assets/ChatGPT Image Oct 7, 2025, 10_31_06 AM_1759813335869.png";

export default function HowItWorks() {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleSteps((prev) => {
              if (prev.includes(index)) return prev;
              return [...prev, index];
            });
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    stepsRef.current.forEach((step) => {
      if (step) observer.observe(step);
    });

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      id: 1,
      number: "01",
      title: "Upload Your Study Material",
      description: "Add PDFs, videos, notes, or paste a URL",
      icon: Upload,
      gradient: "from-cyan-500 to-blue-500",
      iconBg: "from-cyan-500/20 to-blue-500/20",
      visualType: "upload"
    },
    {
      id: 2,
      number: "02",
      title: "AI Processes & Understands",
      description: "Our AI analyzes content and creates personalized resources",
      icon: Sparkles,
      gradient: "from-purple-500 to-pink-500",
      iconBg: "from-purple-500/20 to-pink-500/20",
      visualType: "ai"
    },
    {
      id: 3,
      number: "03",
      title: "Learn with AI Tutor",
      description: "Get instant help, quizzes, notes, and study plans",
      icon: GraduationCap,
      gradient: "from-emerald-500 to-teal-500",
      iconBg: "from-emerald-500/20 to-teal-500/20",
      visualType: "learning"
    }
  ];

  const renderVisual = (type: string, gradient: string) => {
    switch (type) {
      case "upload":
        return (
          <div className="relative h-32 flex items-center justify-center">
            <div className="relative">
              {/* Document stack */}
              <div className="relative w-24 h-28">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-lg transform`}
                    style={{
                      opacity: 0.3 + i * 0.15,
                      transform: `translateY(${i * 4}px) translateX(${i * 2}px)`,
                      transition: 'transform 300ms ease',
                    }}
                  >
                    <div className="p-3 space-y-2">
                      <div className="h-1.5 bg-white/50 rounded" />
                      <div className="h-1 bg-white/40 rounded w-3/4" />
                      <div className="h-1 bg-white/40 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Animated upload arrow */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <ArrowRight 
                  className={`w-8 h-8 text-cyan-400 -rotate-90 animate-bounce-upload`} 
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>
        );

      case "ai":
        return (
          <div className="relative h-32 flex items-center justify-center">
            <div className="relative">
              {/* Avatar with thinking animation */}
              <div className="relative w-20 h-20">
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 blur-xl rounded-full animate-pulse-thinking`} />
                <img
                  src={avatarPath}
                  alt="AI Processing"
                  className="relative w-full h-full rounded-full object-cover border-2 border-white/20"
                />
                {/* Sparkle particles around avatar */}
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2"
                    style={{
                      left: `${Math.cos((i * Math.PI * 2) / 6) * 35 + 35}px`,
                      top: `${Math.sin((i * Math.PI * 2) / 6) * 35 + 35}px`,
                    }}
                  >
                    <Sparkles 
                      className={`w-3 h-3 text-purple-400 animate-sparkle-spin`}
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "learning":
        return (
          <div className="relative h-32 flex items-center justify-center gap-4">
            {/* Student icon (simplified) */}
            <div className="relative">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} opacity-30 flex items-center justify-center`}>
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40" />
              </div>
            </div>
            {/* Interaction arrows */}
            <div className="flex flex-col gap-1">
              <ArrowRight className="w-5 h-5 text-emerald-400 animate-slide-right" />
              <ArrowRight className="w-5 h-5 text-emerald-400 rotate-180 animate-slide-left" />
            </div>
            {/* AI Avatar */}
            <div className="relative w-16 h-16">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30 blur-lg rounded-full`} />
              <img
                src={avatarPath}
                alt="AI Tutor"
                className="relative w-full h-full rounded-full object-cover border-2 border-white/20 animate-graduation-float"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/5 pointer-events-none" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(0deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Section header */}
      <div className="relative z-10 max-w-7xl mx-auto mb-20 text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            How VaktaAI Works
          </span>
        </h2>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Get started in 3 simple steps
        </p>
      </div>

      {/* Steps container */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-0">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isVisible = visibleSteps.includes(index);
            const showArrow = index < steps.length - 1;

            return (
              <div key={step.id} className="flex-1 flex flex-col lg:flex-row items-center w-full lg:w-auto">
                {/* Step Card */}
                <div
                  ref={(el) => (stepsRef.current[index] = el)}
                  data-index={index}
                  data-testid={`card-step-${step.id}`}
                  className={`group relative w-full max-w-sm lg:max-w-none transition-all duration-700 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Gradient border glow on hover */}
                  <div className={`absolute -inset-[1px] bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-100 rounded-3xl blur-sm transition-all duration-500`} />
                  
                  {/* Glass card */}
                  <div className="relative h-full glass-card rounded-3xl p-8 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl">
                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-all duration-500`} />
                    
                    {/* Content */}
                    <div className="relative z-10 space-y-6">
                      {/* Number Badge */}
                      <div className="flex items-center justify-between">
                        <div className={`text-6xl font-bold bg-gradient-to-br ${step.gradient} bg-clip-text text-transparent opacity-30`}>
                          {step.number}
                        </div>
                        
                        {/* Icon in circle */}
                        <div className={`p-4 rounded-full bg-gradient-to-br ${step.iconBg} border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
                          <Icon 
                            className={`w-8 h-8 bg-gradient-to-br ${step.gradient} bg-clip-text text-transparent`} 
                            strokeWidth={2}
                          />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className={`text-2xl font-bold bg-gradient-to-br ${step.gradient} bg-clip-text text-transparent`}>
                        {step.title}
                      </h3>

                      {/* Description */}
                      <p className="text-slate-300 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Visual mockup */}
                      {renderVisual(step.visualType, step.gradient)}
                    </div>
                  </div>
                </div>

                {/* Arrow Connector (Desktop only) */}
                {showArrow && (
                  <div className="hidden lg:flex items-center justify-center px-6 flex-shrink-0">
                    <div 
                      className={`transition-all duration-700 ${
                        isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                      }`}
                      style={{ transitionDelay: `${index * 150 + 300}ms` }}
                    >
                      <ArrowRight 
                        className={`w-12 h-12 text-slate-600 animate-arrow-pulse`}
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                )}

                {/* Vertical Arrow Connector (Mobile only) */}
                {showArrow && (
                  <div className="flex lg:hidden items-center justify-center py-4">
                    <div 
                      className={`transition-all duration-700 ${
                        isVisible ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
                      }`}
                      style={{ transitionDelay: `${index * 150 + 300}ms` }}
                    >
                      <ArrowRight 
                        className={`w-8 h-8 text-slate-600 rotate-90 animate-arrow-pulse`}
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes bounce-upload {
          0%, 100% { 
            transform: translateY(0);
            opacity: 1;
          }
          50% { 
            transform: translateY(-10px);
            opacity: 0.7;
          }
        }

        @keyframes pulse-thinking {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        @keyframes sparkle-spin {
          0% { 
            transform: rotate(0deg) scale(0.8);
            opacity: 0.3;
          }
          50% { 
            transform: rotate(180deg) scale(1.2);
            opacity: 1;
          }
          100% { 
            transform: rotate(360deg) scale(0.8);
            opacity: 0.3;
          }
        }

        @keyframes graduation-float {
          0%, 100% { 
            transform: translateY(0px);
          }
          50% { 
            transform: translateY(-8px);
          }
        }

        @keyframes slide-right {
          0%, 100% { 
            transform: translateX(0);
            opacity: 0.5;
          }
          50% { 
            transform: translateX(8px);
            opacity: 1;
          }
        }

        @keyframes slide-left {
          0%, 100% { 
            transform: translateX(0);
            opacity: 0.5;
          }
          50% { 
            transform: translateX(-8px);
            opacity: 1;
          }
        }

        @keyframes arrow-pulse {
          0%, 100% { 
            opacity: 0.3;
          }
          50% { 
            opacity: 0.8;
          }
        }

        .animate-bounce-upload {
          animation: bounce-upload 2s ease-in-out infinite;
        }

        .animate-pulse-thinking {
          animation: pulse-thinking 2s ease-in-out infinite;
        }

        .animate-sparkle-spin {
          animation: sparkle-spin 3s ease-in-out infinite;
        }

        .animate-graduation-float {
          animation: graduation-float 3s ease-in-out infinite;
        }

        .animate-slide-right {
          animation: slide-right 1.5s ease-in-out infinite;
        }

        .animate-slide-left {
          animation: slide-left 1.5s ease-in-out infinite;
        }

        .animate-arrow-pulse {
          animation: arrow-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
