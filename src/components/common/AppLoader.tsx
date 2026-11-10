import React from 'react';

export interface AppLoaderProps {
  /**
   * Primary title text (defaults to 'Loading Yaa Creations CRM...')
   */
  message?: string;
  /**
   * Subtitle text (defaults to 'Preparing your workspace...')
   */
  subMessage?: string;
  /**
   * Optional custom class for outer container
   */
  className?: string;
}

/**
 * AppLoader - Global Full-Screen Application Loading Screen
 * Replicates the exact neon constellation & triad user-network logo design.
 */
export const AppLoader: React.FC<AppLoaderProps> = ({
  message = 'Loading Yaa Creations CRM...',
  subMessage = 'Preparing your workspace...',
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070B1E] overflow-hidden select-none font-sans ${className}`}
    >
      {/* ========================================================================= */}
      {/* 1. Background Ambient Radiance & Orb Glows */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep ambient radial gradient */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(67, 9, 162, 0.28) 0%, rgba(15, 20, 42, 0.6) 45%, rgba(7, 11, 30, 1) 85%)',
          }}
        />

        {/* Top-left soft glowing sphere */}
        <div
          className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full pointer-events-none opacity-40 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.35) 0%, rgba(67, 9, 162, 0) 70%)',
          }}
        />

        {/* Bottom-right soft glowing sphere */}
        <div
          className="absolute -bottom-40 -right-40 w-[650px] h-[650px] rounded-full pointer-events-none opacity-35 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 70%)',
          }}
        />

        {/* Center emblem backlight glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-16 w-[360px] h-[360px] rounded-full pointer-events-none opacity-60 blur-2xl animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 75%)',
            animationDuration: '4s',
          }}
        />

        {/* ========================================================================= */}
        {/* 2. Constellation Network Curves, Splines & Floating Node Avatars */}
        {/* ========================================================================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1440 900"
        >
          <defs>
            {/* Gradient for left spline */}
            <linearGradient id="curveGradLeft" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.15" />
            </linearGradient>

            {/* Gradient for right spline */}
            <linearGradient id="curveGradRight" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>

            {/* Glowing filter for nodes */}
            <filter id="neonGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="neonGlowPurple" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur1" />
              <feGaussianBlur stdDeviation="10" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Ambient Circles / Planetary Arcs */}
          <circle cx="160" cy="180" r="320" fill="none" stroke="rgba(168, 85, 247, 0.08)" strokeWidth="1" />
          <circle cx="120" cy="680" r="260" fill="none" stroke="rgba(99, 102, 241, 0.07)" strokeWidth="1" />
          <circle cx="1320" cy="740" r="380" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />

          {/* Connecting Spline Curves */}
          {/* Left curve network */}
          <path
            d="M 60 480 C 180 360, 320 380, 580 430"
            fill="none"
            stroke="url(#curveGradLeft)"
            strokeWidth="1.2"
            strokeDasharray="4 2"
            className="opacity-70"
          />
          <path
            d="M 100 240 C 260 280, 420 360, 620 420"
            fill="none"
            stroke="url(#curveGradLeft)"
            strokeWidth="1"
            className="opacity-50"
          />

          {/* Right curve network */}
          <path
            d="M 860 430 C 1040 380, 1180 280, 1380 320"
            fill="none"
            stroke="url(#curveGradRight)"
            strokeWidth="1.2"
            strokeDasharray="4 2"
            className="opacity-70"
          />
          <path
            d="M 820 440 C 1060 480, 1220 580, 1400 640"
            fill="none"
            stroke="url(#curveGradRight)"
            strokeWidth="1"
            className="opacity-50"
          />

          {/* Data pulses travelling along the network lines */}
          <g className="al-reduce-hide">
            <circle r="3" fill="#c4b5fd" filter="url(#neonGlowPurple)">
              <animateMotion dur="5s" repeatCount="indefinite" path="M 60 480 C 180 360, 320 380, 580 430" />
            </circle>
            <circle r="2.5" fill="#7dd3fc" filter="url(#neonGlowCyan)">
              <animateMotion dur="6.5s" begin="-2s" repeatCount="indefinite" path="M 100 240 C 260 280, 420 360, 620 420" />
            </circle>
            <circle r="3" fill="#c4b5fd" filter="url(#neonGlowPurple)">
              <animateMotion dur="5.5s" begin="-1s" repeatCount="indefinite" path="M 860 430 C 1040 380, 1180 280, 1380 320" />
            </circle>
            <circle r="2.5" fill="#7dd3fc" filter="url(#neonGlowCyan)">
              <animateMotion dur="7s" begin="-3.5s" repeatCount="indefinite" path="M 820 440 C 1060 480, 1220 580, 1400 640" />
            </circle>
          </g>

          {/* Left Glowing Node Dot */}
          <circle cx="95" cy="475" r="7" fill="#818cf8" filter="url(#neonGlowCyan)">
            <animate attributeName="opacity" values="1;0.45;1" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="95" cy="475" r="3" fill="#ffffff" />

          {/* Far Left Tiny Dot */}
          <circle cx="28" cy="285" r="3.5" fill="#6366f1" opacity="0.7" />

          {/* Left User Avatar Node 1 */}
          <g transform="translate(250, 360)">
            <animateTransform attributeName="transform" type="translate" values="250 360;253 350;250 360" dur="7s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1" />
            <circle cx="26" cy="26" r="24" fill="rgba(30, 41, 77, 0.6)" stroke="rgba(129, 140, 248, 0.3)" strokeWidth="1.2" />
            <circle cx="26" cy="20" r="5.5" fill="rgba(165, 180, 252, 0.7)" />
            <path
              d="M 16 35 C 16 29, 21 27, 26 27 C 31 27, 36 29, 36 35"
              fill="none"
              stroke="rgba(165, 180, 252, 0.7)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Left Tiny Accent Node */}
          <g transform="translate(325, 335)">
            <animateTransform attributeName="transform" type="translate" values="325 335;328 328;325 335" dur="5.5s" begin="-1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1" />
            <circle cx="14" cy="14" r="13" fill="rgba(30, 41, 77, 0.4)" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
            <circle cx="14" cy="10" r="3" fill="rgba(192, 132, 252, 0.5)" />
            <path
              d="M 9 19 C 9 16, 11 15, 14 15 C 17 15, 19 16, 19 19"
              fill="none"
              stroke="rgba(192, 132, 252, 0.5)"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* Right User Avatar Node 1 (Top Right) */}
          <g transform="translate(1040, 270)">
            <animateTransform attributeName="transform" type="translate" values="1040 270;1043 260;1040 270" dur="6.5s" begin="-2s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1" />
            <circle cx="26" cy="26" r="26" fill="rgba(30, 41, 77, 0.65)" stroke="rgba(129, 140, 248, 0.35)" strokeWidth="1.2" />
            <circle cx="26" cy="20" r="5.5" fill="rgba(165, 180, 252, 0.75)" />
            <path
              d="M 16 35 C 16 29, 21 27, 26 27 C 31 27, 36 29, 36 35"
              fill="none"
              stroke="rgba(165, 180, 252, 0.75)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Right Glowing Node Dot (Far Right) */}
          <circle cx="1280" cy="270" r="8" fill="#a855f7" filter="url(#neonGlowPurple)">
            <animate attributeName="opacity" values="1;0.45;1" dur="3.6s" begin="-1s" repeatCount="indefinite" />
          </circle>
          <circle cx="1280" cy="270" r="3.5" fill="#ffffff" />

          {/* Right User Avatar Node 2 (Lower Right) */}
          <g transform="translate(1210, 475)">
            <animateTransform attributeName="transform" type="translate" values="1210 475;1213 467;1210 475" dur="7.5s" begin="-3s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1" />
            <circle cx="22" cy="22" r="21" fill="rgba(30, 41, 77, 0.5)" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1" />
            <circle cx="22" cy="17" r="4.5" fill="rgba(125, 211, 252, 0.65)" />
            <path
              d="M 13 29 C 13 24, 18 23, 22 23 C 26 23, 31 24, 31 29"
              fill="none"
              stroke="rgba(125, 211, 252, 0.65)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>

          {/* Right Accent Dot */}
          <circle cx="1115" cy="405" r="4" fill="#38bdf8" opacity="0.8" />
          <circle cx="1288" cy="710" r="3" fill="#818cf8" opacity="0.5" />
        </svg>

        {/* Soft twinkling starfield */}
        {[
          ['12%', '18%', 2, 0], ['26%', '72%', 1.5, 1.2], ['38%', '12%', 1.5, 2.1], ['47%', '84%', 2, 0.6],
          ['63%', '16%', 1.5, 1.8], ['72%', '78%', 2, 0.3], ['86%', '40%', 1.5, 2.4], ['92%', '12%', 2, 1.1],
          ['8%', '52%', 1.5, 0.9], ['55%', '90%', 1.5, 1.6],
        ].map(([left, top, size, delay], i) => (
          <span
            key={i}
            className="al-star absolute rounded-full bg-white"
            style={{ left: left as string, top: top as string, width: size as number, height: size as number, animationDelay: `${delay}s` }}
          />
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. Central Interactive Loading Core (Logo Emblem + Typography + Progress) */}
      {/* ========================================================================= */}
      <div className="al-rise relative z-10 flex flex-col items-center justify-center px-4 max-w-md w-full text-center">
        {/* Central Triad Network Emblem */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center mb-8">
          {/* Animated Ambient Outer Halo */}
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-75 animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(56, 189, 248, 0.4) 60%, transparent 80%)',
              animationDuration: '3s',
            }}
          />

          {/* Neon Ring SVG Connector */}
          <svg className="w-full h-full" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>

              <filter id="emblemGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Connecting Neon Ring Structure */}
            <circle
              cx="80"
              cy="84"
              r="44"
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth="7"
              strokeLinecap="round"
              filter="url(#emblemGlow)"
              className="opacity-90"
            />
            {/* Slow orbit ring + spark circling the emblem */}
            <g className="al-spin">
              <circle cx="80" cy="84" r="60" fill="none" stroke="rgba(167,139,250,0.35)" strokeWidth="1" strokeDasharray="2 7" strokeLinecap="round" />
              <circle cx="80" cy="24" r="2.8" fill="#ffffff" filter="url(#emblemGlow)" />
            </g>
            {/* Inner Ring Glow */}
            <circle
              cx="80"
              cy="84"
              r="44"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              className="opacity-40"
            />
          </svg>

          {/* TOP NODE (Violet / Purple) */}
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center z-10 transition-transform duration-500 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.9), 0 0 35px rgba(168, 85, 247, 0.5), inset 0 1.5px 2px rgba(255, 255, 255, 0.6)',
            }}
          >
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {/* BOTTOM-LEFT NODE (Magenta / Violet) */}
          <div
            className="absolute bottom-3 left-3 w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center z-10 transition-transform duration-500 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #c026d3 0%, #9333ea 100%)',
              boxShadow: '0 0 20px rgba(192, 38, 211, 0.9), 0 0 35px rgba(147, 51, 234, 0.5), inset 0 1.5px 2px rgba(255, 255, 255, 0.6)',
            }}
          >
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {/* BOTTOM-RIGHT NODE (Electric Cyan / Blue) */}
          <div
            className="absolute bottom-3 right-3 w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center z-10 transition-transform duration-500 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
              boxShadow: '0 0 22px rgba(56, 189, 248, 0.95), 0 0 35px rgba(37, 99, 235, 0.5), inset 0 1.5px 2px rgba(255, 255, 255, 0.7)',
            }}
          >
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        </div>

        {/* Primary Title */}
        <h1 className="al-title text-xl sm:text-2xl font-semibold tracking-tight mb-5 antialiased">
          {message}
        </h1>

        {/* Progress Bar Capsule Track */}
        <div className="w-[260px] sm:w-[320px] h-2 bg-slate-800/80 rounded-full overflow-hidden p-0 relative border border-slate-700/50 shadow-inner mb-4">
          {/* Animated Gradient Bar Fill */}
          <div
            className="h-full rounded-full app-loader-progress-bar relative overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, #d946ef 0%, #a855f7 50%, #38bdf8 100%)',
              boxShadow: '0 0 14px rgba(168, 85, 247, 0.8), 0 0 22px rgba(56, 189, 248, 0.5)',
            }}
          />
        </div>

        {/* Subtitle Message */}
        <p className="text-xs sm:text-[13px] text-slate-400 font-normal antialiased tracking-wide">
          {subMessage}
        </p>
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          <span className="al-dot" />
          <span className="al-dot" style={{ animationDelay: '0.2s' }} />
          <span className="al-dot" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Global Embedded Styles for the Smooth Shimmer Animation */}
      <style>{`
        @keyframes appLoaderSweep {
          0% {
            width: 8%;
            transform: translateX(-10%);
          }
          50% {
            width: 75%;
            transform: translateX(25%);
          }
          100% {
            width: 100%;
            transform: translateX(0%);
          }
        }

        .app-loader-progress-bar {
          animation: appLoaderSweep 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        }

        .app-loader-progress-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%);
          transform: translateX(-100%);
          animation: appLoaderShine 1.6s ease-in-out infinite;
        }
        @keyframes appLoaderShine { to { transform: translateX(100%); } }

        @keyframes alSpin { to { transform: rotate(360deg); } }
        .al-spin { transform-origin: 80px 84px; animation: alSpin 14s linear infinite; }

        @keyframes alTwinkle { 0%,100% { opacity: .15; transform: scale(1); } 50% { opacity: .9; transform: scale(1.6); } }
        .al-star { opacity: .15; animation: alTwinkle 3.4s ease-in-out infinite; }

        @keyframes alRise { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
        .al-rise { animation: alRise .7s cubic-bezier(.2,.8,.2,1) both; }

        @keyframes alSheen { to { background-position: 200% center; } }
        .al-title {
          color: transparent;
          background-image: linear-gradient(90deg, #ffffff 0%, #ffffff 35%, #c4b5fd 50%, #7dd3fc 60%, #ffffff 75%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          animation: alSheen 5s linear infinite;
        }

        @keyframes alDot { 0%,80%,100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        .al-dot { width: 5px; height: 5px; border-radius: 9999px; background: #a78bfa; animation: alDot 1.2s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .app-loader-progress-bar { width: 100%; animation: none; }
          .app-loader-progress-bar::after, .al-spin, .al-star, .al-rise, .al-title, .al-dot { animation: none; }
          .al-title { color: #fff; background: none; }
          .al-reduce-hide { display: none; }
        }
      `}</style>
    </div>
  );
};

export default AppLoader;
