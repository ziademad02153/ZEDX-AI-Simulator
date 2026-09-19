import React from 'react';
import Image from 'next/image';

// Common classes for all premium icons
const iconClasses = "drop-shadow-lg group-hover:scale-110 transition-transform duration-300";

// 1. Voice Capture
export const GoogleStyleMicIcon = ({ width = "48", height = "48", className = "" }: { width?: number | string, height?: number | string, className?: string }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${iconClasses} ${className}`}>
    <defs>
      <linearGradient id="micCapsule" x1="12" y1="2" x2="12" y2="15" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" />
        <stop offset="1" stopColor="#0d9488" />
      </linearGradient>
      <linearGradient id="micLeft" x1="5" y1="11" x2="12" y2="18" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f59e0b" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="micRight" x1="12" y1="18" x2="19" y2="11" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0d9488" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="micStem" x1="12" y1="18" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#06b6d4" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <rect x="9" y="2" width="6" height="13" rx="3" fill="url(#micCapsule)" />
    <path d="M 5 12 A 7 7 0 0 0 12 19" stroke="url(#micLeft)" strokeWidth="3" fill="none" />
    <path d="M 12 19 A 7 7 0 0 0 19 12" stroke="url(#micRight)" strokeWidth="3" fill="none" />
    <rect x="10.5" y="19" width="3" height="4" fill="url(#micStem)" />
  </svg>
);

// 2. Context Aware (Layers)
export const PremiumContextAwareIcon = () => (
  <Image
    src="/Context Aware.png"
    alt="Context Aware"
    width={48}
    height={48}
    className={iconClasses + " object-contain"}
  />
);

// 3. Multi-Language (Globe)
export const PremiumMultiLangIcon = () => (
  <div className={`relative w-12 h-12 ${iconClasses}`}>
    <Image
      src="/Multi-Language.png"
      alt="Multi-Language"
      fill
      sizes="(max-width: 768px) 100vw, 100px"
      className="object-contain"
    />
    {/* Top Box */}
    <div className="absolute top-[7%] left-[41.5%] w-[17%] h-[11%] rounded-[1.5px] overflow-hidden z-10 opacity-90 hover:opacity-100 transition-opacity">
      <Image src="/ARABIC.png" alt="Arabic" fill sizes="20px" className="object-cover" />
    </div>
    {/* Left Box */}
    <div className="absolute top-[37%] left-[5%] w-[17%] h-[11%] rounded-[1.5px] overflow-hidden z-10 opacity-90 hover:opacity-100 transition-opacity">
      <Image src="/ENG.png" alt="English" fill sizes="20px" className="object-cover" />
    </div>
    {/* Bottom Right Box */}
    <div className="absolute top-[76%] left-[72.5%] w-[17%] h-[11%] rounded-[1.5px] overflow-hidden z-10 opacity-90 hover:opacity-100 transition-opacity">
      <Image src="/SPAIN%20LANG.png" alt="Spanish" fill sizes="20px" className="object-cover" />
    </div>
    {/* Top Right Box (France) */}
    <div className="absolute top-[22%] left-[80%] w-[17%] h-[11%] rounded-[1.5px] overflow-hidden z-10 opacity-90 hover:opacity-100 transition-opacity">
      <Image src="/France%20lang.png" alt="French" fill sizes="20px" className="object-cover" />
    </div>
    {/* Bottom Left Box (German) */}
    <div className="absolute top-[75%] left-[10%] w-[17%] h-[11%] rounded-[1.5px] overflow-hidden z-10 opacity-90 hover:opacity-100 transition-opacity">
      <Image src="/german.png" alt="German" fill sizes="20px" className="object-cover" />
    </div>
  </div>
);

// 4. Instant Transcription (Zap)
export const PremiumInstantTransIcon = () => (
  <Image
    src="/Instant Transcription.png"
    alt="Instant Transcription"
    width={48}
    height={48}
    className={iconClasses + " object-contain"}
  />
);

// 5. Privacy First (Shield with Check)
export const PrivacyShieldIcon = () => (
  <Image
    src="/Privacy First.png"
    alt="Privacy First"
    width={48}
    height={48}
    className={iconClasses + " object-contain"}
  />
);

// 6. Model Agnostic (Cpu)
export const PremiumModelAgnosticIcon = () => (
  <Image
    src="/AI.jpg"
    alt="Model Agnostic AI"
    width={48}
    height={48}
    className={iconClasses + " object-contain rounded-lg"}
  />
);

// 7. Granular Scorecards
export const PremiumGranularScorecardsIcon = () => (
  <Image
    src="/Granular Scorecards.png"
    alt="Granular Scorecards"
    width={64}
    height={64}
    className={iconClasses + " object-contain"}
  />
);

// 8. Smart Silence Detection
export const PremiumSmartSilenceDetectionIcon = () => (
  <Image
    src="/Smart Silence Detection.png"
    alt="Smart Silence Detection"
    width={64}
    height={64}
    className={iconClasses + " object-contain"}
  />
);

// 9. Focused Practice Workspace
export const PremiumFocusedPracticeWorkspaceIcon = () => (
  <Image
    src="/Focused Practice Workspace.png"
    alt="Focused Practice Workspace"
    width={80}
    height={80}
    className={iconClasses + " object-contain"}
  />
);

// 10. Voice-to-Voice Simulation (AI2 + Wave + Mic)
export const PremiumVoiceToVoiceSimulationIcon = () => (
  <div className="flex flex-col items-center justify-center gap-1.5">
    <div className="relative flex items-center justify-center w-10 h-10">
      <Image
        src="/AI2.png"
        alt="AI Agent"
        width={44}
        height={44}
        className="absolute object-cover drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] scale-[1.5]"
        style={{
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 65%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 65%)'
        }}
      />
    </div>

    {/* Animated Wave */}
    <div className="flex items-center gap-[3px] h-4 px-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-emerald-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]"
          style={{
            height: i % 2 === 0 ? '100%' : '50%',
            animationDelay: `${i * 0.15}s`
          }}
        />
      ))}
    </div>

    <div className="flex items-center justify-center">
      <GoogleStyleMicIcon width={32} height={32} />
    </div>
  </div>
);
