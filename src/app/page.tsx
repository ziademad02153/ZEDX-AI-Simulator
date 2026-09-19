import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Check, Globe, Sparkles, ChevronDown, ArrowRight, Star, Code, HelpCircle } from "lucide-react";
import { PlatformSection } from "@/components/platform-section";
import { StartButton } from "@/components/start-button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black font-sans text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <Navbar />

      <main className="flex-grow pt-24 relative">
        {/* Global Background Fusion */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-100/40 rounded-full blur-[100px] animate-float"></div>
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-teal-50/40 rounded-full blur-[120px] animate-float-delayed"></div>
        </div>

        {/* Hero Section */}
        <section className="py-12 md:py-20 text-center container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto flex flex-col items-center">


            <h1 className="text-[2.25rem] xs:text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight text-gray-900 dark:text-white mb-6 md:mb-8 leading-[1.15] md:leading-[1.1] max-w-[90rem] mx-auto px-4">
              Master Your Next Interview <br className="xs:hidden" />
              <span className="text-gradient-fusion">in Any Profession.</span>
            </h1>

            <h2 className="text-[0.95rem] md:text-xl text-gray-500 dark:text-gray-400 mb-4 max-w-4xl mx-auto leading-relaxed font-medium px-6 md:px-0">
              Whether you're a <strong>Software Engineer, Medical Doctor, Sales Manager, or HR Specialist</strong>, ZEDX dynamically adapts to your CV and Job Description to simulate the perfect interview.
            </h2>
            <h3 className="text-[0.85rem] md:text-lg text-lime-600 dark:text-[#84cc16] mb-8 md:mb-12 max-w-4xl mx-auto font-bold tracking-wide px-6 md:px-0">
              Universal AI Mock Interview Simulator • Real-time Feedback • Deep Performance Analytics
            </h3>

            <div className="flex flex-wrap items-center gap-5 w-full justify-center mb-16 px-4 relative z-50">
              <StartButton variant="landing" />
            </div>

            {/* Hero Visual: Video Player */}
            <div className="relative w-full max-w-[56.25rem] lg:max-w-[900px] mx-auto perspective-1000 px-4">
              <div className="bg-black rounded-[1.5rem] md:rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-zinc-700 overflow-hidden relative z-10 transition-transform duration-700 hover:rotate-x-1">
                <div className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-100 dark:border-zinc-700 p-3 md:p-4 flex items-center gap-2 md:gap-2.5">
                  <div className="flex gap-1.5 md:gap-2">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
                    <span className="text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400">
                      ZEDX AI Assistant Demo
                    </span>
                  </div>
                </div>
                <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                  <video
                    src="/zedx.ai.0.1.DEMO.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </div>
              {/* Massive Atmosphere Glow */}
              <div className="absolute -inset-32 bg-gradient-to-r from-green-600/40 via-[#1fa34c]/40 to-emerald-600/40 blur-[160px] -z-10 rounded-[4rem] opacity-90 animate-pulse"></div>
            </div>

          </div>

          <div className="mt-16 md:mt-24 relative w-full max-w-[56.25rem] lg:max-w-[900px] mx-auto perspective-1000 px-4">
            <div className="text-center mb-10 md:mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
                Technical <span className="text-gradient-fusion">Precision.</span>
              </h2>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-zinc-700 overflow-hidden relative z-10 transition-transform duration-700 hover:rotate-x-1">
              <div className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-100 dark:border-zinc-700 p-3 md:p-4 flex items-center gap-2 md:gap-2.5">
                <div className="flex gap-1.5 md:gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
                  <span className="text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Architecture Review
                  </span>
                </div>
              </div>
              <div className="p-4 md:p-10 bg-white dark:bg-zinc-900 min-h-[320px] md:min-h-[350px] flex flex-col items-center justify-center relative overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:3rem_3rem] md:bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>

                {/* Floating Chat Bubbles */}
                <div className="relative z-10 w-full max-w-5xl space-y-6 md:space-y-10">
                  {/* Chat Bubble 1 (AI Question) */}
                  <div className="flex gap-3 md:gap-7 items-start justify-start animate-fade-in-up w-full">
                    <div className="w-8 h-8 md:w-13 md:h-13 rounded-full overflow-hidden bg-green-100 flex items-center justify-center shadow-xl border-2 border-green-500/20 flex-shrink-0">
                      <Image src="/AI.jpg" alt="ZEDX AI Simulator" width={52} height={52} className="object-cover w-full h-full" />
                    </div>
                    <div className="bg-gray-100 dark:bg-zinc-800 rounded-[1.1rem] md:rounded-[2rem] rounded-tl-none p-3.5 md:p-6 text-[0.85rem] md:text-[1.05rem] text-gray-700 dark:text-gray-200 shadow-sm w-full max-w-[calc(100%-3rem)] md:max-w-[85%] min-w-0 border border-gray-200/50 leading-relaxed font-medium">
                      &quot;Can you implement a robust custom React hook for fetching data that includes an abort controller for cleanup, as well as comprehensive loading and error state management?&quot;
                    </div>
                  </div>

                  {/* Chat Bubble 2 (User Code) */}
                  <div className="flex gap-3 md:gap-7 items-start justify-end animate-fade-in-up w-full" style={{ animationDelay: '1s' }}>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 border border-green-200 dark:border-green-800 rounded-[1.1rem] md:rounded-[2.1rem] rounded-tr-none p-4 md:p-8 shadow-xl w-full max-w-[calc(100%-3rem)] md:max-w-[92%] min-w-0 relative border-r-4 border-r-green-500">
                      <div className="absolute -top-2.5 -left-2.5 md:-top-5 md:-left-5 bg-white dark:bg-zinc-800 border-2 border-green-500 dark:border-green-600 rounded-full p-1 md:p-2.5 shadow-xl">
                        <Code className="w-4 h-4 md:w-6 md:h-6 text-green-500" />
                      </div>

                      <div className="bg-white/50 dark:bg-black/30 rounded-xl p-3 md:p-6 mb-3 md:mb-4 font-mono text-[0.65rem] md:text-[0.8rem] leading-relaxed overflow-x-auto border border-black/5 dark:border-white/10 shadow-inner w-full max-w-full">
                        <pre className="text-gray-800 dark:text-gray-200">
                          <span className="text-pink-600 dark:text-pink-400 font-semibold">export function</span> <span className="text-blue-600 dark:text-blue-400">useFetch</span>&lt;<span className="text-teal-600 dark:text-teal-400">T</span>&gt;(<span className="text-orange-600 dark:text-orange-300">url</span>: <span className="text-teal-600 dark:text-teal-400">string</span>) {"{\n"}
                          {"  "}<span className="text-pink-600 dark:text-pink-400 font-semibold">const</span> [<span className="text-sky-600 dark:text-sky-300">data</span>, <span className="text-blue-600 dark:text-blue-400">setData</span>] = <span className="text-yellow-600 dark:text-yellow-200">useState</span>&lt;<span className="text-teal-600 dark:text-teal-400">T | null</span>&gt;(<span className="text-purple-600 dark:text-purple-400">null</span>);{"\n"}
                          {"  "}<span className="text-pink-600 dark:text-pink-400 font-semibold">const</span> [<span className="text-sky-600 dark:text-sky-300">error</span>, <span className="text-blue-600 dark:text-blue-400">setError</span>] = <span className="text-yellow-600 dark:text-yellow-200">useState</span>&lt;<span className="text-teal-600 dark:text-teal-400">Error | null</span>&gt;(<span className="text-purple-600 dark:text-purple-400">null</span>);{"\n"}
                          {"  "}<span className="text-pink-600 dark:text-pink-400 font-semibold">const</span> [<span className="text-sky-600 dark:text-sky-300">loading</span>, <span className="text-blue-600 dark:text-blue-400">setLoading</span>] = <span className="text-yellow-600 dark:text-yellow-200">useState</span>(<span className="text-purple-600 dark:text-purple-400">true</span>);{"\n\n"}
                          {"  "}<span className="text-yellow-600 dark:text-yellow-200">useEffect</span>(() <span className="text-pink-600 dark:text-pink-400 font-semibold">=&gt;</span> {"{\n"}
                          {"    "}<span className="text-pink-600 dark:text-pink-400 font-semibold">const</span> <span className="text-sky-600 dark:text-sky-300">abortController</span> = <span className="text-pink-600 dark:text-pink-400 font-semibold">new</span> <span className="text-teal-600 dark:text-teal-400">AbortController</span>();{"\n"}
                          {"    "}<span className="text-pink-600 dark:text-pink-400 font-semibold">const</span> <span className="text-blue-600 dark:text-blue-400">fetchData</span> = <span className="text-pink-600 dark:text-pink-400 font-semibold">async</span> () <span className="text-pink-600 dark:text-pink-400 font-semibold">=&gt;</span> {"{\n"}
                          {"      "}<span className="text-purple-600 dark:text-purple-400 font-semibold">try</span> {"{\n"}
                          {"        "}<span className="text-pink-600 dark:text-pink-400 font-semibold">const</span> <span className="text-sky-600 dark:text-sky-300">res</span> = <span className="text-purple-600 dark:text-purple-400 font-semibold">await</span> <span className="text-yellow-600 dark:text-yellow-200">fetch</span>(<span className="text-orange-600 dark:text-orange-300">url</span>, {"{ "}signal: <span className="text-sky-600 dark:text-sky-300">abortController</span>.signal{" }"});{"\n"}
                          {"        "}<span className="text-purple-600 dark:text-purple-400 font-semibold">if</span> (!<span className="text-sky-600 dark:text-sky-300">res</span>.ok) <span className="text-purple-600 dark:text-purple-400 font-semibold">throw new</span> <span className="text-teal-600 dark:text-teal-400">Error</span>(<span className="text-green-600 dark:text-green-400">'Failed to fetch data'</span>);{"\n"}
                          {"        "}<span className="text-blue-600 dark:text-blue-400">setData</span>(<span className="text-purple-600 dark:text-purple-400 font-semibold">await</span> <span className="text-sky-600 dark:text-sky-300">res</span>.<span className="text-yellow-600 dark:text-yellow-200">json</span>());{"\n"}
                          {"      "}...
                        </pre>
                      </div>
                    </div>
                    <div className="w-8 h-8 md:w-13 md:h-13 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shadow-md flex-shrink-0 border border-gray-200">
                      <Image src="/IIcon1.jpg" alt="User" width={52} height={52} className="object-cover w-full h-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Massive Atmosphere Glow */}
            <div className="absolute -inset-x-48 top-0 bottom-0 bg-gradient-to-br from-green-600/40 via-[#1fa34c]/30 to-emerald-600/40 dark:from-green-600/30 dark:via-[#1fa34c]/20 dark:to-emerald-600/30 blur-[180px] -z-10 rounded-[5rem] opacity-90 animate-pulse"></div>
          </div>
        </section>

        {/* Platform Integration Section */}
        <PlatformSection />

        {/* Features Section */}
        <section id="features" className="py-24 relative z-10">
          <div className="container mx-auto px-4">

            {/* Suggestion Button */}
            <div className="flex justify-center md:justify-end w-full mb-4 max-w-6xl mx-auto">
              <Link
                href="mailto:zedx.ai.support@gmail.com"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-full shadow-sm hover:shadow-md transition-all hover:scale-105 group"
              >
                <Image
                  src="/suggestion logo.png"
                  alt="Suggestion"
                  width={22}
                  height={22}
                  className="dark:invert opacity-80 group-hover:opacity-100 transition-opacity object-contain"
                />
                <span className="text-[14px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Have a suggestion?
                </span>
              </Link>
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
