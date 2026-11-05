import React from 'react';

/** Friendly waving assistant used in the Copilot welcome banner (inline SVG, no image asset). */
export const CopilotRobot: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 260 230" className={className} role="img" aria-label="Copilot assistant waving hello">
    <defs>
      <linearGradient id="rb-head" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#DDD6FE" />
      </linearGradient>
      <linearGradient id="rb-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F5F3FF" />
        <stop offset="1" stopColor="#C4B5FD" />
      </linearGradient>
      <linearGradient id="rb-ear" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#A78BFA" />
        <stop offset="1" stopColor="#6D28D9" />
      </linearGradient>
      <linearGradient id="rb-core" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3B82F6" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
      <radialGradient id="rb-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#C4B5FD" stopOpacity="0.55" />
        <stop offset="1" stopColor="#C4B5FD" stopOpacity="0" />
      </radialGradient>
    </defs>

    <circle cx="125" cy="130" r="105" fill="url(#rb-glow)" />

    {/* speech bubble */}
    <g>
      <rect x="182" y="8" width="62" height="52" rx="22" fill="#FFFFFF" />
      <path d="M196 56 L186 74 L212 58 Z" fill="#FFFFFF" />
      <path d="M213 20 L218 33 L231 38 L218 43 L213 56 L208 43 L195 38 L208 33 Z" fill="#7C3AED" />
      <path d="M232 18 L234 24 L240 26 L234 28 L232 34 L230 28 L224 26 L230 24 Z" fill="#A78BFA" />
    </g>

    {/* waving arm (right) */}
    <g transform="rotate(-18 190 150)">
      <rect x="182" y="96" width="22" height="64" rx="11" fill="url(#rb-body)" />
      <circle cx="193" cy="94" r="15" fill="url(#rb-head)" />
      <rect x="183" y="76" width="7" height="16" rx="3.5" fill="url(#rb-head)" />
      <rect x="192" y="72" width="7" height="18" rx="3.5" fill="url(#rb-head)" />
      <rect x="201" y="76" width="7" height="16" rx="3.5" fill="url(#rb-head)" />
    </g>

    {/* body */}
    <path d="M70 150 Q70 128 100 128 L152 128 Q182 128 182 150 L184 230 L68 230 Z" fill="url(#rb-body)" />
    <circle cx="126" cy="176" r="21" fill="#EEF2FF" />
    <circle cx="126" cy="176" r="16" fill="url(#rb-core)" />
    <path d="M126 164 L129.5 172.5 L138 176 L129.5 179.5 L126 188 L122.5 179.5 L114 176 L122.5 172.5 Z" fill="#FFFFFF" />

    {/* left arm (resting) */}
    <rect x="52" y="140" width="22" height="62" rx="11" fill="url(#rb-body)" transform="rotate(8 63 140)" />

    {/* head */}
    <rect x="62" y="30" width="128" height="104" rx="42" fill="url(#rb-head)" />
    {/* headphones */}
    <path d="M70 76 Q70 26 126 26 Q182 26 182 76" fill="none" stroke="#7C3AED" strokeWidth="7" strokeLinecap="round" />
    <rect x="48" y="62" width="26" height="46" rx="13" fill="url(#rb-ear)" />
    <rect x="178" y="62" width="26" height="46" rx="13" fill="url(#rb-ear)" />
    {/* visor */}
    <rect x="76" y="48" width="100" height="68" rx="30" fill="#1E0A4A" />
    <rect x="80" y="52" width="92" height="22" rx="11" fill="#FFFFFF" opacity="0.07" />
    {/* happy eyes + smile */}
    <path d="M97 84 Q106 72 115 84" fill="none" stroke="#7DD3FC" strokeWidth="5" strokeLinecap="round" />
    <path d="M137 84 Q146 72 155 84" fill="none" stroke="#7DD3FC" strokeWidth="5" strokeLinecap="round" />
    <path d="M113 98 Q126 108 139 98" fill="none" stroke="#7DD3FC" strokeWidth="4.5" strokeLinecap="round" />
  </svg>
);
