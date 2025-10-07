import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Menu, X } from "lucide-react";
import { FaGithub, FaTwitter, FaLinkedin } from "react-icons/fa";
import logoPath from "@assets/Vakta AI.122_1759509648531.png";
import HeroSection from "@/components/landing/HeroSection";
import InteractiveAvatarDemo from "@/components/landing/InteractiveAvatarDemo";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import StatsSection from "@/components/landing/StatsSection";
import AuthModal from "@/components/landing/AuthModal";

export default function Landing() {
  const [currentLang, setCurrentLang] = useState("English");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const interactiveDemoRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const toggleLanguage = () => {
    setCurrentLang(currentLang === "English" ? "हिन्दी" : "English");
  };

  const onStartLearning = () => {
    setAuthModalTab('signup');
    setIsAuthModalOpen(true);
  };

  const onWatchDemo = () => {
    interactiveDemoRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  const onSignIn = () => {
    setAuthModalTab('login');
    setIsAuthModalOpen(true);
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-600 to-indigo-800">
      {/* Fixed Navigation Bar */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-slate-700/90 backdrop-blur-xl shadow-xl border-b border-cyan-400/50' 
            : 'bg-slate-700/80 backdrop-blur-md'
        }`}
        data-testid="navbar"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3" data-testid="logo-container">
              <img 
                src={logoPath} 
                alt="VaktaAI" 
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                data-testid="img-logo"
              />
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
                VaktaAI
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection(featuresRef)}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                data-testid="link-features"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection(howItWorksRef)}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                data-testid="link-how-it-works"
              >
                How it Works
              </button>
              <button
                onClick={() => scrollToSection(featuresRef)}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                data-testid="link-pricing"
              >
                Pricing
              </button>
            </div>

            {/* Right Section - Language & Sign In */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full glass-card text-sm text-foreground hover:bg-white/10 transition-smooth"
                data-testid="button-language-toggle"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">{currentLang}</span>
              </button>

              {/* Sign In Button - Desktop */}
              <Button
                onClick={onSignIn}
                variant="outline"
                className="hidden md:inline-flex border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400"
                data-testid="button-signin"
              >
                Sign In
              </Button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
                data-testid="button-mobile-menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden glass-card bg-slate-900/95 backdrop-blur-xl border-t border-slate-800"
            data-testid="mobile-menu"
          >
            <div className="px-4 py-4 space-y-3">
              <button
                onClick={() => scrollToSection(featuresRef)}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                data-testid="link-features-mobile"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection(howItWorksRef)}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                data-testid="link-how-it-works-mobile"
              >
                How it Works
              </button>
              <button
                onClick={() => scrollToSection(featuresRef)}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                data-testid="link-pricing-mobile"
              >
                Pricing
              </button>
              <Button
                onClick={onSignIn}
                variant="outline"
                className="w-full border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400"
                data-testid="button-signin-mobile"
              >
                Sign In
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <HeroSection 
        onStartLearning={onStartLearning}
        onWatchDemo={onWatchDemo}
      />

      {/* Interactive Avatar Demo */}
      <div ref={interactiveDemoRef}>
        <InteractiveAvatarDemo />
      </div>

      {/* Feature Showcase */}
      <div ref={featuresRef}>
        <FeatureShowcase />
      </div>

      {/* How It Works */}
      <div ref={howItWorksRef}>
        <HowItWorks />
      </div>

      {/* Stats & Testimonials */}
      <StatsSection />

      {/* Footer */}
      <footer className="relative bg-slate-950 border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8" data-testid="footer">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo & Tagline */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src={logoPath} 
                  alt="VaktaAI" 
                  className="w-10 h-10 object-contain"
                  data-testid="img-footer-logo"
                />
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                  VaktaAI
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your AI-powered study companion. Learn smarter with personalized tutoring, adaptive content, and multilingual support.
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => scrollToSection(featuresRef)}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                    data-testid="link-footer-features"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection(howItWorksRef)}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                    data-testid="link-footer-how-it-works"
                  >
                    How it Works
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection(featuresRef)}
                    className="text-slate-400 hover:text-white transition-colors text-sm"
                    data-testid="link-footer-pricing"
                  >
                    Pricing
                  </button>
                </li>
              </ul>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Connect With Us</h3>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
                  data-testid="link-github"
                  aria-label="GitHub"
                >
                  <FaGithub className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
                  data-testid="link-twitter"
                  aria-label="Twitter"
                >
                  <FaTwitter className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors"
                  data-testid="link-linkedin"
                  aria-label="LinkedIn"
                >
                  <FaLinkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-slate-800">
            <p className="text-center text-slate-500 text-sm" data-testid="text-copyright">
              © {new Date().getFullYear()} VaktaAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
}
