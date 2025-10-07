import { useEffect, useRef, useState } from "react";
import { GraduationCap, FileText, Brain, Sparkles, Calendar, ArrowRight } from "lucide-react";
import avatarPath from "@assets/ChatGPT Image Oct 7, 2025, 10_31_06 AM_1759813335869.png";

export default function FeatureShowcase() {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleCards((prev) => {
              if (prev.includes(index)) return prev;
              return [...prev, index];
            });
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      id: 1,
      title: "AI-Powered Personal Tutor",
      description: "Get instant help in any subject with voice & text",
      icon: GraduationCap,
      gradient: "from-cyan-500 to-blue-600",
      iconBg: "from-cyan-500/20 to-blue-600/20",
      borderGradient: "from-cyan-400 to-blue-600",
      features: "Bilingual • Adaptive • 24/7",
      span: "lg:col-span-2",
      mockup: "avatar"
    },
    {
      id: 2,
      title: "Chat with Documents",
      description: "Upload PDFs, videos & get instant answers",
      icon: FileText,
      gradient: "from-purple-500 to-pink-600",
      iconBg: "from-purple-500/20 to-pink-600/20",
      borderGradient: "from-purple-400 to-pink-600",
      span: "lg:col-span-1",
      mockup: "document"
    },
    {
      id: 3,
      title: "Smart Quiz Generator",
      description: "Auto-generate quizzes from any content",
      icon: Brain,
      gradient: "from-orange-500 to-red-600",
      iconBg: "from-orange-500/20 to-red-600/20",
      borderGradient: "from-orange-400 to-red-600",
      span: "lg:col-span-1",
      mockup: "quiz"
    },
    {
      id: 4,
      title: "AI-Generated Study Notes",
      description: "Automatically create notes, flashcards & mind maps",
      icon: Sparkles,
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "from-emerald-500/20 to-teal-600/20",
      borderGradient: "from-emerald-400 to-teal-600",
      span: "lg:col-span-2",
      mockup: "notes"
    },
    {
      id: 5,
      title: "Personalized Study Plan",
      description: "AI-powered scheduling based on your goals",
      icon: Calendar,
      gradient: "from-indigo-500 to-violet-600",
      iconBg: "from-indigo-500/20 to-violet-600/20",
      borderGradient: "from-indigo-400 to-violet-600",
      span: "lg:col-span-1",
      mockup: "calendar"
    }
  ];

  const renderMockup = (type: string, gradient: string) => {
    switch (type) {
      case "avatar":
        return (
          <div className="relative mt-6 h-32 flex items-center justify-center">
            <div className="relative w-24 h-24">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30 blur-xl rounded-full animate-pulse-glow`} />
              <img
                src={avatarPath}
                alt="AI Tutor Avatar"
                className="relative w-full h-full rounded-full object-cover border-2 border-white/20"
              />
            </div>
          </div>
        );
      
      case "document":
        return (
          <div className="relative mt-6 h-32 flex items-center justify-center space-x-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-16 h-20 bg-gradient-to-br ${gradient} rounded-lg shadow-lg transform transition-all duration-300 hover:scale-110`}
                style={{
                  opacity: 0.3 + i * 0.1,
                  transform: `translateY(${i * 4}px) rotate(${(i - 1) * 8}deg)`,
                  animationDelay: `${i * 0.1}s`
                }}
              >
                <div className="p-2 space-y-1">
                  <div className="h-1 bg-white/40 rounded" />
                  <div className="h-1 bg-white/30 rounded w-3/4" />
                  <div className="h-1 bg-white/30 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        );
      
      case "quiz":
        return (
          <div className="relative mt-6 h-32 flex flex-col justify-center space-y-2 px-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 bg-white/5 rounded-lg p-2 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradient} opacity-60`} />
                <div className="flex-1 h-2 bg-white/20 rounded" />
              </div>
            ))}
          </div>
        );
      
      case "notes":
        return (
          <div className="relative mt-6 h-32 grid grid-cols-2 gap-2 px-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br ${gradient} opacity-20 rounded-lg p-3 backdrop-blur-sm border border-white/10 hover:opacity-30 transition-all duration-300`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="h-1.5 bg-white/50 rounded mb-2" />
                <div className="h-1 bg-white/30 rounded mb-1" />
                <div className="h-1 bg-white/30 rounded w-3/4" />
              </div>
            ))}
          </div>
        );
      
      case "calendar":
        return (
          <div className="relative mt-6 h-32 px-4">
            <div className="grid grid-cols-7 gap-1">
              {[...Array(21)].map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded ${
                    i % 7 === 2 || i % 7 === 5
                      ? `bg-gradient-to-br ${gradient} opacity-40`
                      : 'bg-white/10'
                  } hover:opacity-60 transition-all duration-300`}
                  style={{ animationDelay: `${i * 0.02}s` }}
                />
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-600/5 pointer-events-none" />
      
      {/* Section header */}
      <div className="relative z-10 max-w-7xl mx-auto mb-16 text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Everything You Need
          </span>
          <br />
          <span className="text-white">To Master Any Subject</span>
        </h2>
        <p className="text-xl text-slate-400 max-w-3xl mx-auto">
          A complete AI-powered learning platform with tools designed to help you study smarter, not harder
        </p>
      </div>

      {/* Bento Grid */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isVisible = visibleCards.includes(index);
            
            return (
              <div
                key={feature.id}
                ref={(el) => (cardsRef.current[index] = el)}
                data-index={index}
                data-testid={`card-feature-${feature.id}`}
                className={`group relative ${feature.span} transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Gradient border effect */}
                <div className={`absolute -inset-[1px] bg-gradient-to-br ${feature.borderGradient} opacity-0 group-hover:opacity-100 rounded-3xl blur-sm transition-all duration-500`} />
                
                {/* Glass card */}
                <div className="relative h-full glass-card rounded-3xl p-8 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl">
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-all duration-500`} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.iconBg} border border-white/10 mb-6 group-hover:scale-110 transition-transform duration-500`}>
                      <Icon className={`w-8 h-8 bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent animate-pulse-subtle`} strokeWidth={2} />
                    </div>

                    {/* Title */}
                    <h3 className={`text-2xl font-bold mb-3 bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent`}>
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-300 mb-4 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Additional features (for AI Tutor card) */}
                    {feature.features && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-slate-400 mb-4">
                        {feature.features}
                      </div>
                    )}

                    {/* Visual mockup */}
                    {renderMockup(feature.mockup, feature.gradient)}

                    {/* Learn More link */}
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-400 group-hover:text-white transition-colors duration-300">
                      <span>Learn More</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
