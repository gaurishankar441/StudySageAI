import { useEffect, useRef, useState } from "react";
import { Users, TrendingUp, MessageCircle, Globe, Star, CheckCircle } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function StatsSection() {
  const [visibleStats, setVisibleStats] = useState<number[]>([]);
  const [animatedValues, setAnimatedValues] = useState<{ [key: number]: number }>({});
  const statsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Embla Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Stats data
  const stats = [
    {
      id: 1,
      value: 10000,
      suffix: "+",
      label: "Active Students",
      icon: Users,
      gradient: "from-cyan-500 to-blue-600",
      iconBg: "from-cyan-500/20 to-blue-600/20",
    },
    {
      id: 2,
      value: 95,
      suffix: "%",
      label: "Exam Success Rate",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-green-600",
      iconBg: "from-emerald-500/20 to-green-600/20",
    },
    {
      id: 3,
      value: 50000,
      suffix: "+",
      label: "Questions Answered",
      icon: MessageCircle,
      gradient: "from-purple-500 to-violet-600",
      iconBg: "from-purple-500/20 to-violet-600/20",
    },
    {
      id: 4,
      value: 12,
      suffix: "+",
      label: "Languages Supported",
      icon: Globe,
      gradient: "from-orange-500 to-red-600",
      iconBg: "from-orange-500/20 to-red-600/20",
    },
  ];

  // Testimonials data
  const testimonials = [
    {
      id: 1,
      name: "Rahul Kumar",
      role: "Class 12, Delhi",
      quote: "The AI avatar explains better than my teacher! I improved from 65% to 92% in just 3 months.",
      initial: "R",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      id: 2,
      name: "Priya Sharma",
      role: "Engineering Student, Mumbai",
      quote: "Bilingual support is a game-changer. I can learn complex concepts in my native language.",
      initial: "P",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      id: 3,
      name: "Arjun Patel",
      role: "JEE Aspirant, Ahmedabad",
      quote: "AI-generated quizzes and notes saved me hours. Got AIR 247 in JEE!",
      initial: "A",
      gradient: "from-emerald-500 to-teal-600",
    },
  ];

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Animate counter
  const animateCounter = (index: number, targetValue: number) => {
    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    const startValue = 0;

    const updateCounter = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (easeOutQuart)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

      setAnimatedValues((prev) => ({
        ...prev,
        [index]: currentValue,
      }));

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  };

  // IntersectionObserver for stats
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            if (!visibleStats.includes(index)) {
              setVisibleStats((prev) => [...prev, index]);
              animateCounter(index, stats[index].value);
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    statsRef.current.forEach((stat) => {
      if (stat) observer.observe(stat);
    });

    return () => observer.disconnect();
  }, [visibleStats]);

  // Auto-play carousel
  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000); // 5 seconds

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      clearInterval(autoplay);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-purple-500/10 pointer-events-none" />

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

      <div className="relative z-10 max-w-7xl mx-auto space-y-20">
        {/* Stats Section */}
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Trusted by Thousands
              </span>
            </h2>
            <p className="text-xl text-slate-700 max-w-2xl mx-auto">
              Join students who are achieving their academic goals with VaktaAI
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const isVisible = visibleStats.includes(index);
              const currentValue = animatedValues[index] ?? 0;

              return (
                <div
                  key={stat.id}
                  ref={(el) => (statsRef.current[index] = el)}
                  data-index={index}
                  data-testid={`card-stat-${stat.id}`}
                  className={`group relative transition-all duration-700 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Gradient border effect */}
                  <div className={`absolute -inset-[1px] bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 rounded-3xl blur-sm transition-all duration-500`} />

                  {/* Glass card */}
                  <div className="relative h-full glass-card rounded-3xl p-8 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl">
                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-all duration-500`} />

                    {/* Content */}
                    <div className="relative z-10 text-center space-y-4">
                      {/* Icon */}
                      <div className="flex justify-center">
                        <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${stat.iconBg} border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
                          <Icon className={`w-8 h-8 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} strokeWidth={2} />
                        </div>
                      </div>

                      {/* Animated number */}
                      <div className={`text-5xl font-bold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                        {formatNumber(currentValue)}{stat.suffix}
                      </div>

                      {/* Label */}
                      <p className="text-slate-700 font-medium">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                Student Success Stories
              </span>
            </h2>
            <p className="text-xl text-slate-700 max-w-2xl mx-auto">
              Hear from students who transformed their learning journey
            </p>
          </div>

          {/* Carousel */}
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-6">
                {testimonials.map((testimonial) => (
                  <div
                    key={testimonial.id}
                    className="flex-[0_0_100%] sm:flex-[0_0_90%] md:flex-[0_0_80%] lg:flex-[0_0_70%] xl:flex-[0_0_60%] min-w-0 px-2"
                    data-testid={`card-testimonial-${testimonial.id}`}
                  >
                    {/* Testimonial Card */}
                    <div className="group relative h-full">
                      {/* Gradient border effect */}
                      <div className={`absolute -inset-[1px] bg-gradient-to-br ${testimonial.gradient} opacity-60 group-hover:opacity-100 rounded-3xl blur-sm transition-all duration-500`} />

                      {/* Glass card */}
                      <div className="relative h-full glass-card rounded-3xl p-8 transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl">
                        {/* Glow effect on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-all duration-500`} />

                        {/* Content */}
                        <div className="relative z-10 space-y-6">
                          {/* Header with avatar */}
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <Avatar className="w-16 h-16 ring-2 ring-white/20">
                              <AvatarFallback className={`bg-gradient-to-br ${testimonial.gradient} text-white text-xl font-bold`}>
                                {testimonial.initial}
                              </AvatarFallback>
                            </Avatar>

                            {/* Name and role */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-slate-900">
                                  {testimonial.name}
                                </h3>
                                <CheckCircle className="w-5 h-5 text-blue-400" data-testid={`icon-verified-${testimonial.id}`} />
                              </div>
                              <p className="text-sm text-slate-600 mt-1">
                                {testimonial.role}
                              </p>
                            </div>
                          </div>

                          {/* Quote */}
                          <blockquote className="text-lg text-slate-700 italic leading-relaxed">
                            "{testimonial.quote}"
                          </blockquote>

                          {/* Rating */}
                          <div className="flex gap-1" data-testid={`rating-${testimonial.id}`}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 fill-yellow-400 text-yellow-400`}
                                data-testid={`star-${testimonial.id}-${i + 1}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Carousel dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => emblaApi?.scrollTo(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === selectedIndex
                      ? 'bg-purple-500 w-8'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  data-testid={`dot-${index + 1}`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
