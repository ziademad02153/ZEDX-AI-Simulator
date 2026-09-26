import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Check, Globe, Sparkles, ChevronDown, ArrowRight, Star, Code, HelpCircle, Stethoscope, LineChart, Headphones, PenTool } from "lucide-react";
import { SiAnthropic, SiGooglegemini, SiElevenlabs, SiSupabase } from "react-icons/si";
import { PlatformSection } from "@/components/platform-section";
import { StartButton } from "@/components/start-button";

const PROMPT_CARDS = [
  {
    title: "Software Engineering",
    question: "Can you implement a robust custom React hook for fetching data with comprehensive loading and error state management?",
    answer: "I'll create a useFetch hook that utilizes AbortController in the useEffect cleanup function to cancel pending requests when unmounting.",
    icon: Code,
    gradient: "from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/10",
    border: "border-green-200 dark:border-green-800 border-r-green-500",
    iconBorder: "border-green-500",
    iconColor: "text-green-500",
    code: true
  },
  {
    title: "Medical Practice",
    question: "A 45-year-old patient presents with acute chest pain radiating to the left arm. What is your immediate diagnostic approach?",
    answer: "My immediate priority is to rule out acute coronary syndrome. I would order an ECG and check cardiac biomarkers (Troponin) immediately.",
    icon: Stethoscope,
    gradient: "from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/10",
    border: "border-blue-200 dark:border-blue-800 border-r-blue-500",
    iconBorder: "border-blue-500",
    iconColor: "text-blue-500",
    code: false
  },
  {
    title: "Economics & Finance",
    question: "How would you assess the impact of a sudden increase in interest rates on emerging market equities?",
    answer: "Higher interest rates typically cool domestic inflation. However, it often leads to capital flight from emerging markets, depreciating equities.",
    icon: LineChart,
    gradient: "from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/10",
    border: "border-amber-200 dark:border-amber-800 border-r-amber-500",
    iconBorder: "border-amber-500",
    iconColor: "text-amber-500",
    code: false
  },
  {
    title: "Customer Support",
    question: "An extremely frustrated customer calls because their delivery is 3 days late. How do you de-escalate this situation?",
    answer: "I use the HEART method: Hear them out without interrupting, Empathize, Apologize sincerely, Resolve by tracking the package, and Thank them.",
    icon: Headphones,
    gradient: "from-purple-50 to-fuchsia-50 dark:from-purple-900/30 dark:to-fuchsia-900/10",
    border: "border-purple-200 dark:border-purple-800 border-r-purple-500",
    iconBorder: "border-purple-500",
    iconColor: "text-purple-500",
    code: false
  },
  {
    title: "Design Engineering",
    question: "When designing an HVAC system for a commercial building, how do you balance energy efficiency with air quality?",
    answer: "I implement demand-controlled ventilation with energy recovery ventilators to supply fresh air based on occupancy while recovering heat.",
    icon: PenTool,
    gradient: "from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/10",
    border: "border-rose-200 dark:border-rose-800 border-r-rose-500",
    iconBorder: "border-rose-500",
    iconColor: "text-rose-500",
    code: false
  }
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black font-sans text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <Navbar />

      <main className="flex-grow pt-24 relative">
        {/* Global Background Fusion */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-100/40 rounded-full blur-[100px]"></div>
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-teal-50/40 rounded-full blur-[120px]"></div>
        </div>

        {/* Hero Section */}
        <section className="py-12 md:py-20 text-center container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto flex flex-col items-center">

            <h1 className="text-[2.25rem] xs:text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight text-gray-900 dark:text-white mb-6 md:mb-8 leading-[1.15] md:leading-[1.1] max-w-[90rem] mx-auto px-4">
              Master Your Next Interview <br className="xs:hidden" />
              <span className="text-gradient-fusion">in Any Profession.</span>
            </h1>

            <h2 className="text-[0.95rem] md:text-xl text-gray-500 dark:text-gray-400 mb-4 max-w-6xl mx-auto leading-relaxed font-medium px-6 md:px-0">
              Whether you're a <strong>Software Engineer, Medical Doctor, Sales Manager, or HR Specialist</strong>, ZEDX dynamically adapts to your CV and Job Description to simulate the perfect interview.
            </h2>
            <h3 className="text-[0.85rem] md:text-lg text-lime-600 dark:text-[#84cc16] mb-8 md:mb-12 max-w-6xl mx-auto font-bold tracking-wide px-6 md:px-0">
              Universal AI Mock Interview Simulator • Real-time Feedback • Deep Performance Analytics
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8 w-full justify-center mb-16 px-4 relative z-50">
              <StartButton variant="landing" />
              
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  <img src="https://cdn.21st.dev/assets/localized/59a2b5a0dfc1531e2d1ea42d71ae8615f37582e1f8a17e4a1b1aff9afc7ef878.jpg" alt="Client 1" className="w-10 h-10 rounded-full border-[2px] border-white dark:border-black object-cover shrink-0" />
                  <img src="https://cdn.21st.dev/assets/localized/c7097eeb66ad097b6e5f9dbb95ae857cd6b55c0ad398c1ea84f3ab90a02c631e.jpg" alt="Client 2" className="w-10 h-10 rounded-full border-[2px] border-white dark:border-black object-cover shrink-0" />
                  <img src="https://cdn.21st.dev/assets/localized/c70d48e47d3a2d79ad07d16bff3aa3cff686580be031b6102cad73a15b47d8fd.jpg" alt="Client 3" className="w-10 h-10 rounded-full border-[2px] border-white dark:border-black object-cover shrink-0" />
                  <img src="https://cdn.21st.dev/assets/localized/51c9ed392f6e7fce7fd85a78648e3e06bfdcd91999ab5fa48485888231589abf.jpg" alt="Client 4" className="w-10 h-10 rounded-full border-[2px] border-white dark:border-black object-cover shrink-0" />
                </div>
                <div className="flex flex-col items-start gap-1 text-left">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-[18px] h-[18px] fill-[#ff9933] text-[#ff9933]" />
                    ))}
                  </div>
                  <span className="text-[13px] md:text-[14px] font-medium text-gray-600 dark:text-gray-300">Trusted by 1000+ clients</span>
                </div>
              </div>
            </div>

            {/* Hero Visual: Video Player */}
            <div className="relative w-full max-w-6xl mx-auto perspective-1000 px-4 mt-8">
              <div className="bg-[#050505] rounded-[1.5rem] md:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] border border-gray-200 dark:border-white/10 overflow-hidden relative z-10 transition-transform duration-700 hover:rotate-x-1 ring-1 ring-white/5">
                <div className="bg-gray-50/80 dark:bg-[#111]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 p-3 md:p-4 flex items-center gap-2 md:gap-2.5">
                  <div className="flex gap-1.5 md:gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
                    <span className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400/80 tracking-wide">
                      ZEDX AI Interview
                    </span>
                  </div>
                </div>
                <div className="relative w-full aspect-video bg-black flex items-center justify-center p-0.5">
                  <video
                    src="/zedx.ai.0.1.DEMO.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    className="absolute inset-0 w-full h-full object-cover rounded-b-[1.4rem] md:rounded-b-[1.9rem]"
                  />
                </div>
              </div>
              {/* Massive Atmosphere Glow - Softened and Static */}
              <div className="absolute -inset-32 bg-gradient-to-r from-green-500/20 via-[#1fa34c]/20 to-emerald-500/20 blur-[120px] -z-10 rounded-[4rem] opacity-70 pointer-events-none"></div>
            </div>

          </div>

          <div className="mt-16 md:mt-24 relative w-full perspective-1000 px-0 md:px-4">
            <div className="text-center mb-10 md:mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
                Tailored for <span className="text-gradient-fusion">Every Profession.</span>
              </h2>
            </div>

            <div 
              className="relative w-full max-w-[100vw] mx-auto flex items-center overflow-hidden py-6 md:py-10 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] md:[mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
            >
              <div className="flex w-max animate-marquee will-change-transform gap-6 md:gap-10 hover:[animation-play-state:paused]" style={{ animationDuration: '60s' }}>
                {[...Array(2)].map((_, setIdx) => (
                  <div key={setIdx} className="flex gap-6 md:gap-10 px-2 md:px-4">
                    {PROMPT_CARDS.map((card, idx) => (
                      <div key={idx} className="w-[85vw] sm:w-[500px] md:w-[600px] shrink-0 bg-white dark:bg-zinc-900 rounded-[1.5rem] md:rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-zinc-700 overflow-hidden relative z-10 transition-all duration-500 hover:rotate-x-1 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)]">
                        {/* Header */}
                        <div className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-100 dark:border-zinc-700 p-3 md:p-5 flex items-center gap-2 md:gap-3">
                          <div className="flex gap-1.5 md:gap-2">
                            <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-red-400 shadow-sm"></div>
                            <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-yellow-400 shadow-sm"></div>
                            <div className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-green-400 shadow-sm"></div>
                          </div>
                          <div className="absolute left-0 right-0 flex justify-center pointer-events-none px-12">
                            <span className="text-xs md:text-base font-bold text-gray-800 dark:text-gray-200 truncate tracking-wide bg-gray-200/50 dark:bg-zinc-700/50 px-3 md:px-4 py-0.5 md:py-1 rounded-full border border-gray-300/50 dark:border-zinc-600/50 shadow-inner">
                              {card.title}
                            </span>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 md:p-10 bg-white dark:bg-zinc-900 min-h-[380px] md:min-h-[450px] flex flex-col items-center justify-center relative overflow-hidden">
                          {/* Background Grid */}
                          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:3rem_3rem] md:bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>

                          {/* Chat Bubbles */}
                          <div className="relative z-10 w-full space-y-6 md:space-y-12 min-w-0 mt-2 md:mt-0">
                            {/* AI Question */}
                            <div className="flex gap-2.5 md:gap-5 items-start justify-start w-full min-w-0">
                              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full overflow-hidden bg-green-100 flex items-center justify-center shadow-md border-2 border-green-500/20 flex-shrink-0">
                                <Image src="/AI.jpg" alt="ZEDX AI" width={48} height={48} className="object-cover w-full h-full" />
                              </div>
                              <div className="bg-gray-100 dark:bg-zinc-800 rounded-[1.2rem] md:rounded-[1.5rem] rounded-tl-none p-3 md:p-5 text-[0.8rem] md:text-[0.95rem] text-gray-700 dark:text-gray-200 shadow-sm w-[92%] md:w-[90%] border border-gray-200/50 leading-relaxed font-medium break-words">
                                &quot;{card.question}&quot;
                              </div>
                            </div>

                            {/* User Answer */}
                            <div className="flex gap-2.5 md:gap-5 items-start justify-end w-full min-w-0">
                              <div className={`bg-gradient-to-br ${card.gradient} border ${card.border} rounded-[1.2rem] md:rounded-[1.5rem] rounded-tr-none p-3 md:p-6 shadow-md w-[92%] md:w-[90%] relative`}>
                                <div className={`absolute -top-3 -left-3 md:-top-4 md:-left-4 bg-white dark:bg-zinc-800 border-2 ${card.iconBorder} rounded-full p-1.5 md:p-2 shadow-lg`}>
                                  <card.icon className={`w-3.5 h-3.5 md:w-5 md:h-5 ${card.iconColor}`} />
                                </div>
                                <div className="text-gray-800 dark:text-gray-200 text-[0.8rem] md:text-[0.95rem] leading-relaxed font-medium pt-1 md:pt-0">
                                  {card.code ? (
                                     <pre className="font-mono text-[0.6rem] md:text-[0.75rem] overflow-x-auto whitespace-pre-wrap">{card.answer}</pre>
                                  ) : (
                                     <p>{card.answer}</p>
                                  )}
                                </div>
                              </div>
                              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shadow-md flex-shrink-0 border border-gray-200">
                                <Image src="/IIcon1.jpg" alt="User" width={48} height={48} className="object-cover w-full h-full" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Massive Atmosphere Glow */}
            <div className="absolute -inset-x-48 top-20 bottom-20 bg-gradient-to-br from-green-600/30 via-[#1fa34c]/20 to-emerald-600/30 dark:from-green-600/20 dark:via-[#1fa34c]/10 dark:to-emerald-600/20 blur-[150px] -z-10 rounded-[5rem] opacity-70 pointer-events-none"></div>
          </div>
        </section>

        {/* Platform Integration Section */}
        <PlatformSection />

        {/* Features Section */}
        <section id="features" className="py-24 relative z-10">
          <div className="container mx-auto px-4">

            {/* Partners / Trusted By Marquee */}
            <div className="flex flex-col items-center justify-center w-full mb-28 mt-8 overflow-hidden relative">
              <p className="text-[13px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.25em] mb-12 text-center">
                Powered by industry-leading AI
              </p>

              <div 
                className="relative w-full max-w-[90rem] mx-auto flex items-center overflow-hidden"
                style={{ 
                  maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', 
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' 
                }}
              >
                {/* Marquee Wrapper */}
                <div className="flex w-max animate-marquee will-change-transform" style={{ animationDuration: '40s' }}>
                  
                  {/* Two identical sets for seamless loop */}
                  {[...Array(2)].map((_, setIdx) => (
                    <div key={`partner-set-${setIdx}`} className="flex flex-nowrap items-center gap-20 md:gap-32 pr-20 md:pr-32 opacity-60 dark:opacity-50 hover:opacity-100 transition-opacity duration-300">
                      
                      <div className="flex items-center gap-3 shrink-0 text-gray-800 dark:text-gray-200">
                        <Image src="/openai-logo.png" alt="OpenAI" width={38} height={38} className="dark:invert object-contain shrink-0" />
                        <span className="text-2xl font-bold tracking-tight whitespace-nowrap">OpenAI</span>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0 text-gray-800 dark:text-gray-200">
                        <SiAnthropic className="w-9 h-9 shrink-0" />
                        <span className="text-2xl font-bold tracking-tight whitespace-nowrap" style={{ fontFamily: 'Georgia, serif' }}>Anthropic</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-gray-800 dark:text-gray-200">
                        <SiGooglegemini className="w-9 h-9 shrink-0" />
                        <span className="text-2xl font-bold tracking-tight whitespace-nowrap">Google Gemini</span>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0 text-gray-800 dark:text-gray-200">
                        <SiElevenlabs className="w-8 h-8 shrink-0" />
                        <span className="text-[1.3rem] font-bold tracking-wider whitespace-nowrap uppercase">ElevenLabs</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-gray-800 dark:text-gray-200">
                        <SiSupabase className="w-9 h-9 shrink-0" />
                        <span className="text-2xl font-bold tracking-tight whitespace-nowrap">Supabase</span>
                      </div>

                    </div>
                  ))}

                </div>
              </div>
            </div>

            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Everything you need to <span className="text-gradient-fusion">succeed</span>
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Turn difficult questions into learning opportunities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">

              {/* Feature 1: Context Upload */}
              <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-zinc-200/50 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group">
                <div className="mb-6">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-[#d9f99d] text-green-950 text-[10px] font-extrabold tracking-widest uppercase shadow-sm">
                    Context
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8">Upload Context Documents</h3>

                {/* Visual: Context File */}
                <div className="flex-grow flex items-center justify-center mb-8">
                  <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 p-6 shadow-sm relative overflow-hidden w-full max-w-[280px]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Image src="/cv.png" alt="CV" width={48} height={64} className="object-contain drop-shadow-md" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">Software_Engineer_Resume.pdf</div>
                        <div className="text-xs text-green-600 flex items-center gap-1 font-medium mt-0.5">
                          <Check size={12} /> Analyzed & Ready
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  Upload your CV or technical reports to get highly contextual interview questions and personalized feedback during practice.
                </p>
              </div>

              {/* Feature 2: Real-Time Accessibility */}
              <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-zinc-200/50 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group">
                <div className="mb-6">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-[#d9f99d] text-green-950 text-[10px] font-extrabold tracking-widest uppercase shadow-sm">
                    Instant Verification
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8">Instant Feedback</h3>

                {/* Visual: Chat Bubble */}
                <div className="flex-grow flex items-center justify-center mb-8 w-full">
                  <div className="space-y-4 w-full max-w-[280px]">
                    {/* ZEDX AI Interviewer Asking */}
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-200 dark:border-zinc-700">
                        <Image src="/AI.jpg" alt="ZEDX AI" width={32} height={32} className="object-cover w-full h-full" />
                      </div>
                      <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 p-3.5 rounded-[1.5rem] rounded-bl-sm shadow-[0_10px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_20px_rgba(0,0,0,0.2)] text-[13px] text-gray-700 dark:text-gray-200 w-[85%] font-medium">
                        Can you explain your experience with React?
                      </div>
                    </div>
                    {/* User Answering */}
                    <div className="flex items-end gap-2 justify-end">
                      <div className="bg-gradient-to-br from-[#f4fce3] to-[#d9f99d] dark:from-[#b5f850]/20 dark:to-[#b5f850]/10 border border-[#b5f850]/50 dark:border-[#b5f850]/30 p-3.5 rounded-[1.5rem] rounded-br-sm shadow-[0_10px_25px_rgba(181,248,80,0.3)] dark:shadow-[0_10px_25px_rgba(181,248,80,0.1)] text-[13px] text-green-950 dark:text-emerald-100 w-[85%] font-medium">
                        I used React to build scalable web applications...
                      </div>
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 shadow-md border border-gray-200 dark:border-zinc-700 overflow-hidden">
                        <Image src="/IIcon1.jpg" alt="User" width={32} height={32} className="object-cover w-full h-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  ZEDX AI Simulator listens to your answers and instantly generates real-time feedback and corrections to help you improve.
                </p>
              </div>

              {/* Feature 3: Multilingual */}
              <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-zinc-200/50 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group">
                <div className="mb-6">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-[#d9f99d] text-green-950 text-[10px] font-extrabold tracking-widest uppercase shadow-sm">
                    Multilingual
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8">29 Languages</h3>

                {/* Visual: Language Globe */}
                <div className="flex-grow flex items-center justify-center mb-8 relative">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* Abstract Globe Circles */}
                    <div className="absolute inset-0 border border-green-100/50 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-4 border border-green-200/50 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                    <div className="absolute inset-8 border border-green-300/50 rounded-full animate-[spin_20s_linear_infinite]"></div>

                    {/* Center Icon */}
                    <div className="w-20 h-20 bg-transparent rounded-full flex items-center justify-center z-10 relative">
                      <Image
                        src="/Multi-Language.png"
                        alt="Multi-Language Globe"
                        width={80}
                        height={80}
                        className="rounded-full object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
                      />
                    </div>

                    {/* Floating Flags - Orbiting like planets */}

                    {/* Outer Orbit */}
                    <div className="absolute inset-0 z-20 pointer-events-none" style={{ animation: 'spin 20s linear infinite' }}>
                      <div className="absolute top-0 left-1/2 -ml-[14px] -mt-[10px] pointer-events-auto" style={{ animation: 'spin 20s linear infinite reverse' }}>
                        <div className="relative w-7 h-5 rounded overflow-hidden shadow-md hover:scale-125 transition-transform cursor-pointer">
                          <Image src="/ARABIC.png" alt="Arabic" fill sizes="28px" className="object-cover" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-1/2 -ml-[14px] -mb-[10px] pointer-events-auto" style={{ animation: 'spin 20s linear infinite reverse' }}>
                        <div className="relative w-7 h-5 rounded overflow-hidden shadow-md hover:scale-125 transition-transform cursor-pointer">
                          <Image src="/SPAIN%20LANG.png" alt="Spanish" fill sizes="28px" className="object-cover" />
                        </div>
                      </div>
                    </div>

                    {/* Middle Orbit */}
                    <div className="absolute inset-4 z-20 pointer-events-none" style={{ animation: 'spin 15s linear infinite reverse' }}>
                      <div className="absolute top-1/2 left-0 -mt-[10px] -ml-[14px] pointer-events-auto" style={{ animation: 'spin 15s linear infinite' }}>
                        <div className="relative w-7 h-5 rounded overflow-hidden shadow-md hover:scale-125 transition-transform cursor-pointer">
                          <Image src="/ENG.png" alt="English" fill sizes="28px" className="object-cover" />
                        </div>
                      </div>
                      <div className="absolute top-1/2 right-0 -mt-[10px] -mr-[14px] pointer-events-auto" style={{ animation: 'spin 15s linear infinite' }}>
                        <div className="relative w-7 h-5 rounded overflow-hidden shadow-md hover:scale-125 transition-transform cursor-pointer">
                          <Image src="/France%20lang.png" alt="French" fill sizes="28px" className="object-cover" />
                        </div>
                      </div>
                    </div>

                    {/* Inner Orbit */}
                    <div className="absolute inset-8 z-20 pointer-events-none" style={{ animation: 'spin 10s linear infinite' }}>
                      <div className="absolute top-0 right-0 -mt-[5px] -mr-[5px] pointer-events-auto" style={{ animation: 'spin 10s linear infinite reverse' }}>
                        <div className="relative w-7 h-5 rounded overflow-hidden shadow-md hover:scale-125 transition-transform cursor-pointer">
                          <Image src="/german.png" alt="German" fill sizes="28px" className="object-cover" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  Simulate interview questions in any language - practice your professional communication wherever you are.
                </p>
              </div>

              {/* Feature 4: AI Analysis */}
              <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-zinc-200/50 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group">
                <div className="mb-6">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-[#d9f99d] text-green-950 text-[10px] font-extrabold tracking-widest uppercase shadow-sm">
                    Analysis
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8">Performance Analysis</h3>

                {/* Visual: Summary Card Mockup */}
                <div className="flex-grow flex items-center justify-center mb-8">
                  <div className="w-full max-w-[280px] bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-200 dark:border-zinc-700">
                          <Image src="/AI.jpg" alt="ZEDX AI" width={32} height={32} className="object-cover w-full h-full" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white">Training</div>
                          <div className="text-[10px] text-gray-400">Interview Analysis</div>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400 drop-shadow-sm" />)}
                      </div>
                    </div>

                    <div className="bg-green-50/50 dark:bg-green-900/20 rounded-xl p-3 mb-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Summary</div>
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-gray-200 rounded-full"></div>
                        <div className="h-1.5 w-[90%] bg-gray-200 rounded-full"></div>
                        <div className="h-1.5 w-[95%] bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  After each practice session, get detailed automated feedback and AI-powered action items to improve your answers.
                </p>
              </div>

            </div>


          </div>
        </section>
      </main>

      {/* Flat transition into footer */}
      <Footer />
    </div >
  );
}
