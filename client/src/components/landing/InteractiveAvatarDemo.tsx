import { useState, useEffect } from "react";
import { Mic, Globe, Brain } from "lucide-react";
import avatarPath from "@assets/ChatGPT Image Oct 7, 2025, 10_31_06 AM_1759813335869.png";

interface Message {
  id: number;
  role: "student" | "ai";
  text: string;
}

type AvatarStatus = "online" | "thinking" | "speaking";

const conversation: Message[] = [
  { id: 1, role: "student", text: "Can you explain photosynthesis?" },
  { id: 2, role: "ai", text: "Of course! Let me break it down step by step. Photosynthesis is the process by which plants convert light energy into chemical energy..." },
  { id: 3, role: "student", text: "Can you explain in Hindi?" },
  { id: 4, role: "ai", text: "बिल्कुल! प्रकाश संश्लेषण वह प्रक्रिया है जिसमें पौधे प्रकाश ऊर्जा को रासायनिक ऊर्जा में परिवर्तित करते हैं..." },
];

const features = [
  { icon: Mic, label: "Voice Chat", gradient: "from-pink-500 to-rose-500" },
  { icon: Globe, label: "Bilingual", gradient: "from-cyan-500 to-blue-500" },
  { icon: Brain, label: "Adaptive", gradient: "from-purple-500 to-indigo-500" },
];

export default function InteractiveAvatarDemo() {
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>("online");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const runConversation = async () => {
      if (currentIndex >= conversation.length) {
        // Wait before restarting
        await new Promise(resolve => setTimeout(resolve, 3000));
        setDisplayedMessages([]);
        setCurrentIndex(0);
        setAvatarStatus("online");
        return;
      }

      const currentMessage = conversation[currentIndex];

      // Set thinking state before message
      if (currentMessage.role === "ai") {
        setAvatarStatus("thinking");
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Show typing indicator
      setIsTyping(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      setIsTyping(false);

      // Set speaking state for AI
      if (currentMessage.role === "ai") {
        setAvatarStatus("speaking");
      }

      // Add message
      setDisplayedMessages(prev => [...prev, currentMessage]);

      // Reset avatar to online after AI speaks
      if (currentMessage.role === "ai") {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setAvatarStatus("online");
      }

      // Move to next message
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCurrentIndex(prev => prev + 1);
    };

    runConversation();
  }, [currentIndex]);

  const getStatusColor = (status: AvatarStatus) => {
    switch (status) {
      case "online": return "bg-green-400";
      case "thinking": return "bg-yellow-400";
      case "speaking": return "bg-blue-400";
    }
  };

  const getStatusLabel = (status: AvatarStatus) => {
    switch (status) {
      case "online": return "Online";
      case "thinking": return "Thinking";
      case "speaking": return "Speaking";
    }
  };

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5 pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900">
            See It In <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">Action</span>
          </h2>
          <p className="text-xl text-slate-700 max-w-2xl mx-auto">
            Watch how our AI tutor adapts to your learning style and language preference
          </p>
        </div>

        {/* Main demo container - Glass card */}
        <div className="glass-card rounded-3xl p-1 bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-purple-600/20 animate-fade-in-up" data-testid="container-demo">
          <div className="bg-slate-50/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 lg:p-10">
            
            {/* Split layout */}
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
              
              {/* Avatar Section - 30% on desktop */}
              <div className="lg:w-[30%] flex flex-col items-center space-y-6">
                {/* Avatar with glow */}
                <div className="relative">
                  {/* Pulsing glow - more intense when speaking */}
                  <div className={`absolute inset-0 -m-6 transition-opacity duration-500 ${avatarStatus === 'speaking' ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 opacity-40 blur-2xl animate-pulse-glow" />
                  </div>

                  {/* Avatar container */}
                  <div className={`relative w-40 h-40 sm:w-48 sm:h-48 transition-transform duration-300 ${avatarStatus === 'speaking' ? 'scale-105' : 'scale-100'}`}>
                    {/* Holographic glow background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 rounded-2xl opacity-30 blur-lg" />
                    
                    {/* Avatar image */}
                    <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-xl shadow-cyan-500/30">
                      <img
                        src={avatarPath}
                        alt="AI Tutor Avatar"
                        className="w-full h-full object-cover"
                        data-testid="img-demo-avatar"
                      />
                      
                      {/* Holographic overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-transparent to-blue-600/20 mix-blend-overlay" />
                      
                      {/* Scan line effect when speaking */}
                      {avatarStatus === 'speaking' && (
                        <div className="absolute inset-0 opacity-40">
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent animate-scan-line" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50" data-testid="status-indicator">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(avatarStatus)} animate-pulse-subtle`} />
                  <span className="text-sm font-medium text-slate-700">{getStatusLabel(avatarStatus)}</span>
                </div>

                {/* Feature badges */}
                <div className="hidden lg:flex flex-col gap-3 w-full">
                  {features.map((feature, index) => (
                    <div
                      key={feature.label}
                      className={`flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 animate-fade-in-up stagger-${index + 1}`}
                      data-testid={`badge-${feature.label.toLowerCase()}`}
                    >
                      <div className={`p-2 bg-gradient-to-br ${feature.gradient} rounded-lg`}>
                        <feature.icon className="w-4 h-4 text-slate-900" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Section - 70% on desktop */}
              <div className="lg:w-[70%] flex flex-col">
                {/* Chat messages container */}
                <div className="flex-1 space-y-4 min-h-[300px] sm:min-h-[350px]" data-testid="chat-container">
                  {displayedMessages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'} animate-fade-in-up stagger-${(index % 6) + 1}`}
                      data-testid={`message-${message.role}-${message.id}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl ${
                          message.role === 'student'
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                            : 'bg-slate-800/80 text-slate-100 border border-slate-700/50'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1 opacity-75">
                          {message.role === 'student' ? 'You' : 'AI Tutor'}
                        </div>
                        <p className="text-sm sm:text-base leading-relaxed">{message.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex justify-start animate-fade-in" data-testid="typing-indicator">
                      <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-1">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Feature badges for mobile */}
                <div className="flex lg:hidden gap-3 mt-6 flex-wrap justify-center">
                  {features.map((feature, index) => (
                    <div
                      key={feature.label}
                      className={`flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 animate-fade-in-up stagger-${index + 1}`}
                      data-testid={`badge-mobile-${feature.label.toLowerCase()}`}
                    >
                      <div className={`p-1.5 bg-gradient-to-br ${feature.gradient} rounded-md`}>
                        <feature.icon className="w-3 h-3 text-slate-900" />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </section>
  );
}
