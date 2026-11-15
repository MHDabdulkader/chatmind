import React from 'react';

export default function RobotMascot({ className = "w-32 h-32" }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Soft warm glowing background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/50 via-orange-100/40 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 rounded-full blur-xl scale-125 pointer-events-none" />

      <svg
        viewBox="0 0 200 200"
        className="w-full h-full relative drop-shadow-md transition-transform duration-300 hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Desk surface */}
        <ellipse cx="100" cy="172" rx="72" ry="12" fill="#EADFD2" className="dark:fill-[#322A24]" />
        
        {/* Little decorative floating sparkles */}
        <circle cx="28" cy="48" r="3.5" fill="#E07A5F" opacity="0.8" />
        <circle cx="170" cy="54" r="2.5" fill="#E07A5F" opacity="0.6" />
        <circle cx="38" cy="120" r="2" fill="#F4A261" opacity="0.7" />
        
        {/* Tiny Antenna */}
        <path d="M100 48 V32" stroke="#D3C5B4" strokeWidth="4" strokeLinecap="round" className="dark:stroke-[#5A4F46]" />
        <circle cx="100" cy="28" r="6" fill="#E07A5F" className="animate-pulse" />

        {/* Robot Head */}
        <rect
          x="54"
          y="44"
          width="92"
          height="72"
          rx="32"
          fill="#FAF8F5"
          stroke="#E0D6C9"
          strokeWidth="4"
          className="dark:fill-[#2A241F] dark:stroke-[#453A32]"
        />

        {/* Head Screen / Visor */}
        <rect
          x="66"
          y="56"
          width="68"
          height="48"
          rx="20"
          fill="#2D2825"
          className="dark:fill-[#151210]"
        />

        {/* Glowing friendly eyes */}
        <ellipse cx="85" cy="78" rx="6.5" ry="8" fill="#4ADE80" />
        <ellipse cx="115" cy="78" rx="6.5" ry="8" fill="#4ADE80" />
        {/* Smiling eye highlights */}
        <path d="M80 81 Q85 76 90 81" stroke="#2D2825" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M110 81 Q115 76 120 81" stroke="#2D2825" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M96 90 Q100 93 104 90" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />

        {/* Blush cheeks */}
        <circle cx="74" cy="88" r="4" fill="#F87171" opacity="0.6" />
        <circle cx="126" cy="88" r="4" fill="#F87171" opacity="0.6" />

        {/* Ears / Side audio nodes */}
        <rect x="46" y="64" width="8" height="26" rx="4" fill="#E07A5F" />
        <rect x="146" y="64" width="8" height="26" rx="4" fill="#E07A5F" />

        {/* Robot Torso */}
        <rect
          x="68"
          y="118"
          width="64"
          height="46"
          rx="18"
          fill="#FAF8F5"
          stroke="#E0D6C9"
          strokeWidth="3.5"
          className="dark:fill-[#2A241F] dark:stroke-[#453A32]"
        />
        {/* Chest Heart / Badge */}
        <circle cx="100" cy="136" r="6" fill="#E07A5F" />

        {/* Laptop on desk */}
        <polygon
          points="70,165 130,165 138,172 62,172"
          fill="#8A7D73"
          className="dark:fill-[#4A4038]"
        />
        {/* Laptop Screen */}
        <rect
          x="75"
          y="142"
          width="50"
          height="23"
          rx="3"
          fill="#A89A8D"
          stroke="#7A6E64"
          strokeWidth="2"
          className="dark:fill-[#38302A] dark:stroke-[#2B241F]"
        />
        {/* Laptop Screen Glow & Chat Logo */}
        <rect x="78" y="145" width="44" height="17" rx="2" fill="#FAF8F5" opacity="0.9" />
        <circle cx="100" cy="153" r="3" fill="#E07A5F" />

        {/* Robot Left Arm typing on laptop */}
        <path
          d="M68 126 C58 138, 62 160, 78 165"
          stroke="#FAF8F5"
          strokeWidth="10"
          strokeLinecap="round"
          className="dark:stroke-[#2A241F]"
        />

        {/* Robot Right Arm waving */}
        <path
          d="M132 126 C148 122, 156 102, 150 92"
          stroke="#FAF8F5"
          strokeWidth="10"
          strokeLinecap="round"
          className="dark:stroke-[#2A241F]"
        />
        <circle cx="150" cy="90" r="6" fill="#E07A5F" />
      </svg>
    </div>
  );
}
