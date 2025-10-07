import { useEffect, useRef, useState } from "react";
import { GraduationCap, FileText, Brain, Sparkles, Calendar, ArrowRight, MessageCircle, CheckCircle, Clock, Tag, BookOpen, BarChart3, Lightbulb } from "lucide-react";
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
          <div className="relative mt-6 h-48 space-y-3">
            {/* AI Message */}
            <div className="flex items-start gap-3 animate-fade-in-up">
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30 blur-lg rounded-full animate-pulse-glow`} />
                <img
                  src={avatarPath}
                  alt="AI Tutor"
                  className="relative w-full h-full rounded-full object-cover border-2 border-white/20"
                />
              </div>
              <div className="flex-1 glass-card rounded-2xl p-3 max-w-[200px] bg-white/80">
                <p className="text-sm text-slate-700">
                  Let me explain photosynthesis in simple terms...
                </p>
              </div>
            </div>

            {/* User Message */}
            <div className="flex items-start gap-3 justify-end animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="glass-card rounded-2xl p-3 max-w-[180px] bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
                <p className="text-sm text-slate-800">
                  Can you give an example?
                </p>
              </div>
            </div>

            {/* Typing Indicator */}
            <div className="flex items-start gap-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30 blur-lg rounded-full animate-pulse-glow`} />
                <img
                  src={avatarPath}
                  alt="AI Tutor"
                  className="relative w-full h-full rounded-full object-cover border-2 border-white/20"
                />
              </div>
              <div className="glass-card rounded-2xl p-3 flex gap-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        );
      
      case "document":
        return (
          <div className="relative mt-6 h-48 space-y-3">
            {/* PDF Preview */}
            <div className="glass-card rounded-xl p-3 space-y-2 animate-fade-in-up">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-700">Cell Biology.pdf</span>
                <span className="text-xs text-slate-500">• pg. 45</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2 space-y-1">
                <div className="h-1.5 bg-white/30 rounded w-full" />
                <div className="h-1.5 bg-white/30 rounded w-5/6" />
                <div className="h-1.5 bg-purple-400/40 rounded w-3/4" />
              </div>
            </div>

            {/* Question */}
            <div className="glass-card rounded-xl p-3 bg-gradient-to-br from-purple-500/10 to-pink-600/10 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700">What is mitochondria?</p>
              </div>
            </div>

            {/* AI Answer with Citation */}
            <div className="glass-card rounded-xl p-3 space-y-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <p className="text-xs text-slate-700">
                Mitochondria is the powerhouse of the cell...
                <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                  <Tag className="w-3 h-3" />
                  pg. 45
                </span>
              </p>
            </div>
          </div>
        );
      
      case "quiz":
        return (
          <div className="relative mt-6 h-48 space-y-3">
            {/* Quiz Header */}
            <div className="flex items-center justify-between animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-slate-700">3/10</span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/20 to-pink-600/20 border border-orange-500/30">
                  <span className="text-xs font-semibold text-orange-300">+120 pts</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                <Clock className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-orange-300">0:45</span>
              </div>
            </div>

            {/* Question */}
            <div className="glass-card rounded-xl p-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <p className="text-sm text-slate-700 font-medium">
                What is the speed of light?
              </p>
            </div>

            {/* MCQ Options */}
            <div className="space-y-2">
              {[
                { label: 'A', text: '3 × 10⁸ m/s', isCorrect: true },
                { label: 'B', text: '3 × 10⁶ m/s', isCorrect: false },
                { label: 'C', text: '3 × 10⁷ m/s', isCorrect: false },
                { label: 'D', text: '3 × 10⁹ m/s', isCorrect: false }
              ].map((option, i) => (
                <div
                  key={i}
                  className={`group glass-card rounded-lg p-2.5 flex items-center gap-3 cursor-pointer transition-all duration-300 hover:bg-orange-500/10 animate-fade-in-up ${
                    option.isCorrect ? 'border border-orange-500/30' : ''
                  }`}
                  style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    option.isCorrect 
                      ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white' 
                      : 'bg-white/10 text-slate-400 group-hover:bg-white/20'
                  }`}>
                    {option.label}
                  </div>
                  <span className="text-xs text-slate-700">{option.text}</span>
                  {option.isCorrect && (
                    <CheckCircle className="w-4 h-4 text-orange-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      case "notes":
        return (
          <div className="relative mt-6 h-48 space-y-3">
            {/* Note Card */}
            <div className="glass-card rounded-xl p-4 space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-emerald-400">Cell Biology Notes</h4>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              
              {/* Key Points */}
              <div className="space-y-2">
                {[
                  'Cells are basic units of life',
                  'Mitochondria generates energy'
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-2 animate-fade-in-up" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700">{point}</span>
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div className="flex gap-2 pt-2">
                <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
                  Biology
                </span>
                <span className="px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300">
                  Chapter 3
                </span>
              </div>
            </div>

            {/* Flashcard Preview */}
            <div className="glass-card rounded-xl p-3 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-xs text-emerald-400">Q</span>
                </div>
                <span className="text-xs text-slate-700">What is photosynthesis?</span>
              </div>
            </div>
          </div>
        );
      
      case "calendar":
        return (
          <div className="relative mt-6 h-48 space-y-3">
            {/* Week Header */}
            <div className="flex items-center justify-between animate-fade-in-up">
              <span className="text-xs font-semibold text-slate-700">This Week</span>
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" style={{ width: '65%' }} />
                </div>
                <span className="text-[10px] text-indigo-400">65%</span>
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {[
                { task: 'Study Mathematics', time: '9:00 AM - 11:00 AM', done: true },
                { task: 'Physics Practice', time: '2:00 PM - 3:30 PM', done: false },
                { task: 'Chemistry Quiz', time: '4:00 PM - 5:00 PM', done: false }
              ].map((item, i) => (
                <div
                  key={i}
                  className={`glass-card rounded-lg p-2.5 flex items-center gap-3 animate-fade-in-up ${
                    item.done ? 'bg-indigo-500/5' : ''
                  }`}
                  style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    item.done
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-500'
                      : 'border-white/20'
                  }`}>
                    {item.done && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${item.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {item.task}
                    </p>
                    <p className="text-[10px] text-slate-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-purple-500/10 pointer-events-none" />
      
      {/* Section header */}
      <div className="relative z-10 max-w-7xl mx-auto mb-16 text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Everything You Need
          </span>
          <br />
          <span className="text-slate-900">To Master Any Subject</span>
        </h2>
        <p className="text-xl text-slate-700 max-w-3xl mx-auto">
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
                    <p className="text-slate-700 mb-4 leading-relaxed">
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
