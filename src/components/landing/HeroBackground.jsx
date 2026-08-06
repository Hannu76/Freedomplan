import React from 'react';

const curves = Array.from({ length: 8 });

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* Base Background Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-bg-new.png')" }}
      />

      {/* Glow 1 */}
      <div
        className="
        absolute
        -top-20
        right-10
        w-[520px]
        h-[520px]
        rounded-full
        bg-violet-300/25
        blur-[170px]
        animate-floatSlow
        "
      />

      {/* Glow 2 */}

      <div
        className="
        absolute
        bottom-0
        right-0
        w-[420px]
        h-[420px]
        rounded-full
        bg-pink-300/25
        blur-[180px]
        animate-floatReverse
        "
      />

      {/* Glow 3 */}

      <div
        className="
        absolute
        top-56
        right-72
        w-[350px]
        h-[350px]
        rounded-full
        bg-cyan-300/20
        blur-[150px]
        animate-floatSlow
        "
      />

      {/* Glow Overlay */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
    </div>
  );
}
